const dayjs = require('dayjs');
const { EmbedBuilder } = require('discord.js');
const db = require('./db');
const { log } = require('./logger');

const CHECK_INTERVAL_MINUTES = 15; // Jalankan setiap 15 menit

/**
 * Memeriksa buku yang sudah melewati batas waktu peminjaman dan mengirim notifikasi.
 * @param {import('discord.js').Client} client 
 */
async function checkOverdueLoans(client) {
    log('INFO', 'SCHEDULER', 'Menjalankan pengecekan buku terlambat...');

    try {
        const [overdueLoans] = await db.query(`
            SELECT 
                p.id_peminjaman, 
                p.timestamp_pinjam, 
                p.durasi_pinjam, 
                p.penanggung_jawab,
                b.nama_buku,
                k.nama_kelas
            FROM peminjaman p
            JOIN buku b ON p.id_buku = b.id_buku
            JOIN kelas k ON p.id_kelas = k.id_kelas
            WHERE 
                p.status = 'DIPINJAM' 
                AND p.durasi_pinjam IS NOT NULL 
                AND p.notifikasi_terlambat = 0
        `);

        if (overdueLoans.length === 0) {
            log('INFO', 'SCHEDULER', 'Tidak ada buku terlambat yang perlu notifikasi.');
            return;
        }

        const adminChannelId = client.config.channels.laporanHarian;
        const adminChannel = await client.channels.fetch(adminChannelId).catch(() => null);

        if (!adminChannel) {
            log('ERROR', 'SCHEDULER', `Channel laporan harian (ID: ${adminChannelId}) tidak ditemukan untuk mengirim notifikasi keterlambatan.`);
            return;
        }

        for (const loan of overdueLoans) {
            const expiryTime = dayjs(loan.timestamp_pinjam).add(loan.durasi_pinjam, 'minute');

            if (dayjs().isAfter(expiryTime)) {
                // Buku ini sudah terlambat
                log('WARN', 'SCHEDULER', `Peminjaman ID ${loan.id_peminjaman} terlambat. Mengirim notifikasi...`);

                const overdueEmbed = new EmbedBuilder()
                    .setColor('Red')
                    .setTitle('🚨 Peringatan Keterlambatan Pengembalian Buku')
                    .setDescription(`Peminjaman berikut telah melewati batas waktu pengembalian.`)
                    .addFields(
                        { name: 'Buku', value: loan.nama_buku, inline: false },
                        { name: 'Peminjam', value: `${loan.penanggung_jawab} (${loan.nama_kelas})`, inline: false },
                        { name: 'Waktu Pinjam', value: dayjs(loan.timestamp_pinjam).format("DD MMM YYYY, HH:mm"), inline: true },
                        { name: 'Seharusnya Kembali', value: expiryTime.format("DD MMM YYYY, HH:mm"), inline: true }
                    )
                    .setTimestamp();
                
                try {
                    await adminChannel.send({ embeds: [overdueEmbed] });

                    // Tandai di database agar tidak dinotifikasi lagi
                    await db.query('UPDATE peminjaman SET notifikasi_terlambat = 1 WHERE id_peminjaman = ?', [loan.id_peminjaman]);
                    log('INFO', 'SCHEDULER', `Notifikasi untuk peminjaman ID ${loan.id_peminjaman} berhasil dikirim dan ditandai.`);

                } catch (sendError) {
                    log('ERROR', 'SCHEDULER', `Gagal mengirim notifikasi untuk peminjaman ID ${loan.id_peminjaman}: ${sendError.message}`);
                }
            }
        }

    } catch (error) {
        log('ERROR', 'SCHEDULER', `Terjadi kesalahan saat memeriksa buku terlambat: ${error.message}`);
    }
}

/**
 * Memulai scheduler untuk menjalankan pengecekan secara periodik.
 * @param {import('discord.js').Client} client 
 */
function startScheduler(client) {
    log('INFO', 'SCHEDULER', `Scheduler diaktifkan. Pengecekan akan dilakukan setiap ${CHECK_INTERVAL_MINUTES} menit.`);
    // Jalankan sekali saat bot startup
    checkOverdueLoans(client);
    // Jalankan secara periodik
    setInterval(() => checkOverdueLoans(client), CHECK_INTERVAL_MINUTES * 60 * 1000);
}

module.exports = { startScheduler };