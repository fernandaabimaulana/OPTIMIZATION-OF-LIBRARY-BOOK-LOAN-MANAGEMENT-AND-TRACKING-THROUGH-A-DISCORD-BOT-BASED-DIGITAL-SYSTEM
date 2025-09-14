const { EmbedBuilder } = require('discord.js');
const db = require('./db');
const dayjs = require('dayjs');
require('dayjs/locale/id');
dayjs.locale('id');
const { log } = require('./logger');

/**
 * Membuat dan memposting status peminjaman buku saat ini ke channel.
 * Dipanggil oleh cleanupAndPostStatus.
 * @param {import('discord.js').Client} client - Discord client.
 * @param {string} channelId - ID channel tujuan.
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
                p.id_peminjaman, p.jumlah_pinjam, p.penanggung_jawab, p.nama_guru_pengajar, p.timestamp_pinjam, p.durasi_pinjam,
                b.id_buku, b.nama_buku,
                k.nama_kelas
            FROM peminjaman p
            JOIN buku b ON p.id_buku = b.id_buku
            JOIN kelas k ON p.id_kelas = k.id_kelas
            WHERE p.status = 'DIPINJAM'
            ORDER BY p.timestamp_pinjam ASC
        `);

        if (peminjaman.length === 0) {
            const embed = new EmbedBuilder()
                .setColor(0x95a5a6)
                .setTitle('📚 Status Peminjaman Buku – SMANUNG')
                .setDescription('Tidak ada peminjaman aktif saat ini.')
                .setFooter({ text: `Status diperbarui otomatis • ${dayjs().format("HH:mm")}` })
                .setTimestamp();
            await channel.send({ embeds: [embed] });
            return;
        }

        // Header embed pertama
        const headerEmbed = new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle('📚 Status Peminjaman Buku – SMANUNG')
            .setDescription(`Total **${peminjaman.length}** peminjaman sedang aktif.`)
            .setFooter({ text: `Status diperbarui otomatis • ${dayjs().format("HH:mm")}` })
            .setTimestamp();
        await channel.send({ embeds: [headerEmbed] });

        // Kirim embed per peminjaman
        for (const p of peminjaman) {
            const expiryTimestamp = dayjs(p.timestamp_pinjam).add(p.durasi_pinjam, 'minute').unix();

            const embed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle(`📖 ${p.nama_buku} (ID: ${p.id_buku})`)
                .addFields(
                    { name: "👤 Peminjam", value: `${p.penanggung_jawab} (${p.nama_kelas})`, inline: false },
                    { name: "👨‍🏫 Guru Pengajar", value: p.nama_guru_pengajar || "Tidak ditentukan", inline: true },
                    { name: "📦 Jumlah", value: `${p.jumlah_pinjam} buku`, inline: true },
                    { name: "⏰ Waktu Pinjam", value: dayjs(p.timestamp_pinjam).format("dddd, DD MMMM YYYY • HH:mm"), inline: false },
                    { name: "⌛ Waktu Berakhir", value: p.durasi_pinjam ? `<t:${expiryTimestamp}:R>` : 'Tidak ditentukan', inline: true }
                )
                .setTimestamp();

            await channel.send({ embeds: [embed] });
        }

        log('INFO', 'STATUS', `Status peminjaman (${peminjaman.length}) berhasil dikirim ke channel #${channel.name}.`);

    } catch (error) {
        log('ERROR', 'STATUS', `Gagal mengirim status peminjaman: ${error.message}\n${error.stack}`);
    }
}

module.exports = updateStatus;
