const { EmbedBuilder } = require('discord.js');
const db = require('./db');
const dayjs = require('dayjs');
const { log } = require('./logger');

/**
 * Creates and posts the current book borrowing status to a specified channel.
 * This function is called by cleanupAndPostStatus.
 * @param {import('discord.js').Client} client The Discord client.
 * @param {string} channelId The ID of the channel to post the status to.
 */
async function updateStatus(client, channelId) {
    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel) {
            log('ERROR', 'STATUS', `Channel status dengan ID ${channelId} tidak ditemukan.`);
            return;
        }

        const [peminjaman] = await db.query(`
            SELECT 
                p.id_peminjaman, p.jumlah_pinjam, p.penanggung_jawab, p.nama_guru_pengajar, p.timestamp_pinjam,
                b.nama_buku,
                k.nama_kelas
            FROM peminjaman p
            JOIN buku b ON p.id_buku = b.id_buku
            JOIN kelas k ON p.id_kelas = k.id_kelas
            WHERE p.status = 'DIPINJAM'
            ORDER BY p.timestamp_pinjam ASC
        `);

        if (peminjaman.length > 0) {
            const header = `**LAPORAN PEMINJAMAN AKTIF**\nTotal **${peminjaman.length}** peminjaman sedang aktif.\n\n`;

            const allPeminjamanStrings = peminjaman.map(p => {
                const unixTimestamp = dayjs(p.timestamp_pinjam).unix();
                
                return `---\n` +
                       `**${p.nama_buku}** (ID: ${p.id_peminjaman})\n` +
                       `Peminjam: **${p.penanggung_jawab}** (Kelas: ${p.nama_kelas})\n` +
                       `Guru: ${p.nama_guru_pengajar || 'N/A'}\n` +
                       `Jumlah: ${p.jumlah_pinjam} buku\n` +
                       `Waktu Pinjam: <t:${unixTimestamp}:F>\n` +
                       `Durasi Pinjam: <t:${unixTimestamp}:R>`;
            }).join('\n\n');

            const fullDescription = header + allPeminjamanStrings;

            const descriptionChunks = [];
            for (let i = 0; i < fullDescription.length; i += 4096) {
                descriptionChunks.push(fullDescription.substring(i, i + 4096));
            }

            for (let i = 0; i < descriptionChunks.length; i++) {
                const chunk = descriptionChunks[i];
                const embed = new EmbedBuilder().setColor(0x0099FF).setDescription(chunk);
                if (i === 0) {
                    embed.setTitle('Selamat datang di status peminjaman buku! SMANUNG').setTimestamp().setFooter({ text: 'Status diperbarui secara otomatis.' });
                }
                await channel.send({ embeds: [embed] });
            }
        } else {
            const embed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle('Selamat datang di status peminjaman buku! SMANUNG')
                .setTimestamp()
                .setFooter({ text: 'Status diperbarui secara otomatis.' })
                .setDescription('**LAPORAN PEMINJAMAN AKTIF**\nSaat ini tidak ada buku yang sedang dipinjam.');
            await channel.send({ embeds: [embed] });
        }
        log('INFO', 'STATUS', `Status peminjaman berhasil dikirim ke channel #${channel.name}.`);

    } catch (error) {
        log('ERROR', 'STATUS', `Gagal mengirim status peminjaman: ${error.message}\n${error.stack}`);
    }
}

module.exports = updateStatus;