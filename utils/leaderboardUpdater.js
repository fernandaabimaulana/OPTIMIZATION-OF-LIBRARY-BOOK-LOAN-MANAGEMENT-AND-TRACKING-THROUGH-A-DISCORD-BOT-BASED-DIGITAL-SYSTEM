const { EmbedBuilder } = require('discord.js');
const db = require('../utils/db');
const { log } = require('../utils/logger');

async function updateLeaderboard(client) {
    try {
        const leaderboardChannelId = client.config.channels.leaderboardPeminjaman;
        if (!leaderboardChannelId) {
            log('WARN', 'LEADERBOARD', 'Leaderboard channel ID not found in config.json.');
            return;
        }

        const leaderboardChannel = await client.channels.fetch(leaderboardChannelId).catch(() => null);
        if (!leaderboardChannel) {
            log('ERROR', 'LEADERBOARD', `Could not fetch leaderboard channel with ID: ${leaderboardChannelId}`);
            return;
        }

        // Fetch top 10 borrowers
        const [borrowers] = await db.query(
            `SELECT p.penanggung_jawab, pu.discord_id, SUM(p.jumlah_pinjam) as total_buku_dipinjam, COUNT(p.id_peminjaman) as total_kali_meminjam
             FROM peminjaman p
             JOIN pengguna pu ON p.penanggung_jawab = pu.nama_lengkap
             GROUP BY p.penanggung_jawab, pu.discord_id
             ORDER BY total_buku_dipinjam DESC, total_kali_meminjam DESC
             LIMIT 10`
        );

        let description = '';
        if (borrowers.length === 0) {
            description = 'Belum ada data peminjaman untuk ditampilkan di leaderboard.';
        } else {
            const medal = ['🥇', '🥈', '🥉'];
            for (let i = 0; i < borrowers.length; i++) {
                const borrower = borrowers[i];
                let displayName = borrower.penanggung_jawab;
                if (!displayName && borrower.discord_id) {
                    try {
                        const user = await client.users.fetch(borrower.discord_id);
                        displayName = user.tag;
                    } catch (e) {
                        log('WARN', 'LEADERBOARD', `Could not fetch user tag for ID: ${borrower.discord_id}`);
                        displayName = `ID: ${borrower.discord_id}`;
                    }
                } else if (!displayName) {
                    displayName = 'Unknown User';
                }
                const rankMedal = medal[i] || `#${i + 1}`;
                description += `${rankMedal} **${displayName}**\n 📚 ${borrower.total_buku_dipinjam} buku | 🔄 ${borrower.total_kali_meminjam} kali\n`;
            }
        }

        const embed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle('🏆 Leaderboard Peminjaman Buku')
            .setDescription(description)
            .setFooter({ text: 'Leaderboard otomatis diperbarui setiap peminjaman.' })
            .setTimestamp();

        // Hapus pesan lama, update satu pesan saja
        const messages = await leaderboardChannel.messages.fetch({ limit: 10 });
        const botMessages = messages.filter(msg => msg.author.id === client.user.id);

        let leaderboardMsg;
        if (botMessages.size > 0) {
            leaderboardMsg = botMessages.first();
            await leaderboardMsg.edit({ embeds: [embed] });
        } else {
            await leaderboardChannel.send({ embeds: [embed] });
        }

        log('INFO', 'LEADERBOARD', 'Leaderboard updated successfully.');
    } catch (error) {
        log('ERROR', 'LEADERBOARD', `Error updating leaderboard: ${error.message}`);
    }
}

module.exports = { updateLeaderboard };
