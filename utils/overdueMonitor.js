/*
================================================================================
File: 📁 smanung-library-bot/utils/overdueMonitor.js
Tujuan: Sistem monitoring real-time untuk denda keterlambatan peminjaman buku
Versi: 1.2.0 (Fine Ledger Integration)
================================================================================
*/

const { EmbedBuilder } = require('discord.js');
const dayjs = require('dayjs');
const duration = require('dayjs/plugin/duration');
dayjs.extend(duration);
const { log } = require('./logger');

class OverdueMonitor {
    constructor(client) {
        this.client = client;
        this.db = client.db;
        this.activeLoans = new Map(); // Map<loanId, { timer, data, warningsSent }>
        this.FINE_PER_SECOND = 1.39; // Rp 1,39 per detik
        this.FINE_PER_HOUR = 5000; // Rp 5.000 per jam
        this.UPDATE_INTERVAL = 1000; // Update setiap detik
        this.DB_UPDATE_THRESHOLD = 100; // Update DB setiap Rp 100 perubahan
    }

    async initialize() {
        try {
            log('INFO', 'OVERDUE_MONITOR', 'Initializing overdue monitoring system...');
            const [activeLoans] = await this.db.query(`
                SELECT 
                    p.id_peminjaman, p.timestamp_pinjam, p.durasi_pinjam, p.penanggung_jawab, 
                    p.denda, b.nama_buku, k.nama_kelas, pen.discord_id
                FROM peminjaman p
                JOIN buku b ON p.id_buku = b.id_buku
                JOIN kelas k ON p.id_kelas = k.id_kelas
                LEFT JOIN pengguna pen ON p.penanggung_jawab = pen.nama_lengkap
                WHERE p.status = 'DIPINJAM' AND p.durasi_pinjam IS NOT NULL
            `);
            for (const loan of activeLoans) {
                this.startMonitoring(loan);
            }
            log('INFO', 'OVERDUE_MONITOR', `Monitoring started for ${activeLoans.length} active loans.`);
        } catch (error) {
            log('ERROR', 'OVERDUE_MONITOR', `Failed to initialize: ${error.message}`);
        }
    }

    startMonitoring(loanData) {
        const loanId = loanData.id_peminjaman;
        if (this.activeLoans.has(loanId)) {
            clearInterval(this.activeLoans.get(loanId).timer);
        }
        const borrowTime = dayjs(loanData.timestamp_pinjam);
        const dueTime = borrowTime.add(loanData.durasi_pinjam, 'minute');
        const monitorData = {
            data: loanData,
            borrowTime,
            dueTime,
            warningsSent: new Set(),
            lastDbUpdate: loanData.denda || 0,
            currentFine: loanData.denda || 0
        };
        const timer = setInterval(async () => {
            await this.checkAndUpdateLoan(loanId, monitorData);
        }, this.UPDATE_INTERVAL);
        this.activeLoans.set(loanId, { timer, ...monitorData });
        this.checkAndUpdateLoan(loanId, monitorData);
        log('INFO', 'OVERDUE_MONITOR', `Started monitoring loan ID ${loanId} - Due: ${dueTime.format('DD/MM HH:mm')}`);
    }

    async checkAndUpdateLoan(loanId, monitorData) {
        const now = dayjs();
        const { dueTime, data, warningsSent } = monitorData;
        const timeUntilDue = dueTime.diff(now, 'second');
        if (timeUntilDue > 0) {
            if (timeUntilDue <= 300 && !warningsSent.has('5min')) {
                await this.sendReminder(data, 5);
                warningsSent.add('5min');
            }
        } else {
            const overdueSeconds = Math.abs(timeUntilDue);
            const currentFine = Math.floor(overdueSeconds * this.FINE_PER_SECOND);
            monitorData.currentFine = currentFine;
            if (currentFine - monitorData.lastDbUpdate >= this.DB_UPDATE_THRESHOLD) {
                await this.updateFineInDb(loanId, currentFine);
                monitorData.lastDbUpdate = currentFine;
            }
            await this.sendProgressiveWarnings(data, overdueSeconds, currentFine, warningsSent);
            if (!warningsSent.has('overdue_posted')) {
                await this.postToOverdueChannel(data, currentFine);
                warningsSent.add('overdue_posted');
            }
            if (overdueSeconds % 60 === 0) {
                await this.updateOverdueDisplay(loanId, data, currentFine, overdueSeconds);
            }
        }
    }

    async sendReminder(loanData, minutesLeft) {
        if (!loanData.discord_id) return;
        try {
            const user = await this.client.users.fetch(loanData.discord_id);
            const embed = new EmbedBuilder()
                .setColor('Yellow')
                .setTitle('⏰ Pengingat Pengembalian Buku')
                .setDescription(`Hai ${loanData.penanggung_jawab}! Buku yang Anda pinjam akan jatuh tempo dalam **${minutesLeft} menit**.`)
                .addFields(
                    { name: '📚 Buku', value: loanData.nama_buku, inline: true },
                    { name: '🏫 Kelas', value: loanData.nama_kelas, inline: true }
                )
                .setFooter({ text: 'Harap segera kembalikan untuk menghindari denda.' })
                .setTimestamp();
            await user.send({ embeds: [embed] });
            log('INFO', 'OVERDUE_MONITOR', `Reminder sent to ${loanData.penanggung_jawab} - ${minutesLeft} minutes left`);
        } catch (error) {
            log('WARN', 'OVERDUE_MONITOR', `Failed to send reminder: ${error.message}`);
        }
    }

    async sendProgressiveWarnings(loanData, overdueSeconds, currentFine, warningsSent) {
        if (!loanData.discord_id) return;
        const overdueHours = Math.floor(overdueSeconds / 3600);
        const warningSchedule = [{ hours: 0, key: 'initial' }, { hours: 1, key: '1hour' }, { hours: 3, key: '3hours' }, { hours: 6, key: '6hours' }, { hours: 12, key: '12hours' }, { hours: 24, key: '24hours' }];
        for (const warning of warningSchedule) {
            if (overdueHours >= warning.hours && !warningsSent.has(warning.key)) {
                await this.sendOverdueWarning(loanData, currentFine, overdueSeconds);
                warningsSent.add(warning.key);
                break;
            }
        }
    }

    async sendOverdueWarning(loanData, currentFine, overdueSeconds) {
        if (!loanData.discord_id) return;
        try {
            const user = await this.client.users.fetch(loanData.discord_id);
            const duration = dayjs.duration(overdueSeconds, 'seconds');
            const formattedDuration = this.formatDuration(duration);
            const embed = new EmbedBuilder()
                .setColor('Red')
                .setTitle('🚨 PERINGATAN KETERLAMBATAN')
                .setDescription(`**${loanData.penanggung_jawab}**, Anda telah terlambat mengembalikan buku!`)
                .addFields(
                    { name: '📚 Buku', value: loanData.nama_buku, inline: false },
                    { name: '⏱️ Keterlambatan', value: formattedDuration, inline: true },
                    { name: '💰 Denda Saat Ini', value: `Rp ${currentFine.toLocaleString('id-ID')}`, inline: true },
                    { name: '📈 Rate Denda', value: `Rp ${this.FINE_PER_HOUR.toLocaleString('id-ID')}/jam`, inline: true }
                )
                .setFooter({ text: '⚠️ Denda terus bertambah! Segera kembalikan buku ke perpustakaan.' })
                .setTimestamp();
            await user.send({ embeds: [embed] });
            log('INFO', 'OVERDUE_MONITOR', `Overdue warning sent to ${loanData.penanggung_jawab} - Fine: Rp ${currentFine}`);
        } catch (error) {
            log('WARN', 'OVERDUE_MONITOR', `Failed to send overdue warning: ${error.message}`);
        }
    }

    async postToOverdueChannel(loanData, currentFine) {
        const channelId = this.client.config.channels.keterlambatanPeminjaman;
        if (!channelId) return;
        try {
            const channel = await this.client.channels.fetch(channelId);
            const embed = new EmbedBuilder()
                .setColor('Red')
                .setTitle('📍 Peminjaman Terlambat Baru')
                .setDescription('Peminjaman berikut telah melewati batas waktu pengembalian')
                .addFields(
                    { name: '👤 Peminjam', value: loanData.penanggung_jawab, inline: true },
                    { name: '📚 Buku', value: loanData.nama_buku, inline: true },
                    { name: '🏫 Kelas', value: loanData.nama_kelas, inline: true },
                    { name: '⏰ Waktu Pinjam', value: dayjs(loanData.timestamp_pinjam).format('DD/MM HH:mm'), inline: true },
                    { name: '⏱️ Durasi', value: `${loanData.durasi_pinjam} menit`, inline: true },
                    { name: '💰 Denda', value: `Rp ${currentFine.toLocaleString('id-ID')}`, inline: true }
                )
                .setFooter({ text: `ID Peminjaman: ${loanData.id_peminjaman} | Denda terus berjalan...` })
                .setTimestamp();
            const message = await channel.send({ embeds: [embed] });
            const loanMonitor = this.activeLoans.get(loanData.id_peminjaman);
            if (loanMonitor) {
                loanMonitor.overdueMessageId = message.id;
                try {
                    await this.db.query('UPDATE peminjaman SET denda_message_id = ? WHERE id_peminjaman = ?', [message.id, loanData.id_peminjaman]);
                    log('INFO', 'OVERDUE_MONITOR', `Stored overdue message ID ${message.id} for loan ${loanData.id_peminjaman}`);
                } catch (dbError) {
                    log('ERROR', 'OVERDUE_MONITOR', `Failed to store overdue message ID in DB: ${dbError.message}`);
                }
            }
            log('INFO', 'OVERDUE_MONITOR', `Posted overdue notification for loan ID ${loanData.id_peminjaman}`);
        } catch (error) {
            log('ERROR', 'OVERDUE_MONITOR', `Failed to post to overdue channel: ${error.message}`);
        }
    }

    async updateOverdueDisplay(loanId, loanData, currentFine, overdueSeconds) {
        const channelId = this.client.config.channels.keterlambatanPeminjaman;
        if (!channelId) return;
        const loanMonitor = this.activeLoans.get(loanId);
        if (!loanMonitor || !loanMonitor.overdueMessageId) return;
        try {
            const channel = await this.client.channels.fetch(channelId);
            const message = await channel.messages.fetch(loanMonitor.overdueMessageId);
            const duration = dayjs.duration(overdueSeconds, 'seconds');
            const formattedDuration = this.formatDuration(duration);
            const embed = EmbedBuilder.from(message.embeds[0]);
            const fields = embed.data.fields;
            const fineFieldIndex = fields.findIndex(f => f.name === '💰 Denda');
            if (fineFieldIndex !== -1) {
                fields[fineFieldIndex].value = `Rp ${currentFine.toLocaleString('id-ID')} 🔴`;
            }
            const overdueFieldIndex = fields.findIndex(f => f.name === '⏱️ Terlambat');
            if (overdueFieldIndex !== -1) {
                fields[overdueFieldIndex].value = formattedDuration;
            } else {
                embed.addFields({ name: '⏱️ Terlambat', value: formattedDuration, inline: true });
            }
            await message.edit({ embeds: [embed] });
        } catch (error) {
            log('WARN', 'OVERDUE_MONITOR', `Failed to update overdue display: ${error.message}`);
        }
    }

    async updateFineInDb(loanId, fineAmount) {
        try {
            await this.db.query('UPDATE peminjaman SET denda = ? WHERE id_peminjaman = ?', [fineAmount, loanId]);
            log('DEBUG', 'OVERDUE_MONITOR', `Updated fine for loan ID ${loanId}: Rp ${fineAmount}`);
        } catch (error) {
            log('ERROR', 'OVERDUE_MONITOR', `Failed to update fine in DB: ${error.message}`);
        }
    }

    handleNewLoan(loanData) {
        if (loanData && loanData.durasi_pinjam) {
            this.startMonitoring(loanData);
            log('INFO', 'OVERDUE_MONITOR', `Added new loan ID ${loanData.id_peminjaman} to monitoring`);
        }
    }

    async handleLoanReturn(loanId) {
        const loanMonitor = this.activeLoans.get(loanId);
        if (!loanMonitor) {
            log('WARN', 'OVERDUE_MONITOR', `handleLoanReturn called for non-monitored loan ID ${loanId}. Might have been returned already.`);
            return;
        }

        clearInterval(loanMonitor.timer);
        
        const now = dayjs();
        const overdueSeconds = Math.max(0, now.diff(loanMonitor.dueTime, 'second'));
        const finalFine = overdueSeconds > 0 ? Math.floor(overdueSeconds * this.FINE_PER_SECOND) : 0;

        await this.updateFineInDb(loanId, finalFine);

        if (finalFine > 0 && loanMonitor.data.discord_id) {
            try {
                await this.db.query(
                    'UPDATE pengguna SET total_denda_tertunggak = total_denda_tertunggak + ? WHERE discord_id = ?',
                    [finalFine, loanMonitor.data.discord_id]
                );
                log('INFO', 'OVERDUE_MONITOR', `Added Rp ${finalFine} to user ${loanMonitor.data.discord_id}'s outstanding fine balance.`);
            } catch (dbError) {
                log('ERROR', 'OVERDUE_MONITOR', `Failed to update total_denda_tertunggak for user ${loanMonitor.data.discord_id}: ${dbError.message}`);
            }
        }
        
        if (loanMonitor.overdueMessageId) {
            try {
                const channel = await this.client.channels.fetch(this.client.config.channels.keterlambatanPeminjaman);
                const message = await channel.messages.fetch(loanMonitor.overdueMessageId);
                const oldEmbed = message.embeds[0];
                
                const updatedEmbed = new EmbedBuilder(oldEmbed.data)
                    .setColor('Green')
                    .setTitle('✅ Peminjaman Terlambat (LUNAS)')
                    .setFooter({ text: `ID Peminjaman: ${loanId} | Lunas pada ${now.format('DD/MM/YYYY HH:mm')}` });

                const fineFieldIndex = updatedEmbed.data.fields.findIndex(f => f.name.startsWith('💰 Denda'));
                if (fineFieldIndex !== -1) {
                    updatedEmbed.spliceFields(fineFieldIndex, 1, { 
                        name: '💰 Denda Dibayar', 
                        value: `Rp ${finalFine.toLocaleString('id-ID')} 🟢`,
                        inline: true 
                    });
                }
                
                await message.edit({ embeds: [updatedEmbed] });
                log('INFO', 'OVERDUE_MONITOR', `Updated overdue message ${loanMonitor.overdueMessageId} to LUNAS.`);
            } catch (e) {
                log('WARN', 'OVERDUE_MONITOR', `Failed to edit overdue message ${loanMonitor.overdueMessageId}: ${e.message}`);
            }
        }

        this.activeLoans.delete(loanId);
        log('INFO', 'OVERDUE_MONITOR', `Stopped monitoring loan ID ${loanId} - Final fine: Rp ${finalFine}`);
    }

    formatDuration(duration) {
        const days = Math.floor(duration.asDays());
        const hours = duration.hours();
        const minutes = duration.minutes();
        const seconds = duration.seconds();
        let parts = [];
        if (days > 0) parts.push(`${days} hari`);
        if (hours > 0) parts.push(`${hours} jam`);
        if (minutes > 0) parts.push(`${minutes} menit`);
        if (seconds > 0 && days === 0) parts.push(`${seconds} detik`);
        return parts.join(' ') || '0 detik';
    }

    shutdown() {
        log('INFO', 'OVERDUE_MONITOR', 'Shutting down overdue monitor...');
        for (const [loanId, monitor] of this.activeLoans) {
            clearInterval(monitor.timer);
        }
        this.activeLoans.clear();
    }
}

module.exports = OverdueMonitor;