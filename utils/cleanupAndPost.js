const updateStatus = require('./updateStatus');
const { log } = require('./logger');

/**
 * Membersihkan pesan status lama dari bot di channel, lalu memposting status yang baru.
 * @param {import('discord.js').Client} client - Discord Client
 * @param {string} channelId - ID channel tempat status akan diposting
 */
async function cleanupAndPostStatus(client, channelId) {
    if (!channelId) {
        log('ERROR', 'CLEANUP', 'Channel ID untuk status tidak disediakan di config.');
        return;
    }

    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel) {
            log('ERROR', 'CLEANUP', `Channel dengan ID ${channelId} tidak ditemukan.`);
            return;
        }

        // 1. Ambil dan hapus pesan lama dari bot
        const messages = await channel.messages.fetch({ limit: 100 });
        const botMessages = messages.filter(m => m.author.id === client.user.id);
        
        if (botMessages.size > 0) {
            log('INFO', 'CLEANUP', `Ditemukan ${botMessages.size} pesan status lama, memulai penghapusan...`);
            // Menghapus pesan satu per satu untuk menghindari batasan bulkDelete (pesan > 14 hari dan jumlah < 2)
            for (const message of botMessages.values()) {
                await message.delete().catch(err => log('WARN', 'CLEANUP_DELETE', `Gagal menghapus pesan ${message.id}: ${err.message}`));
            }
            log('INFO', 'CLEANUP', `Selesai menghapus pesan lama di channel #${channel.name}.`);
        }

        // 2. Kirim status yang baru
        await updateStatus(client, channelId);

    } catch (err) {
        log('ERROR', 'CLEANUP', `Gagal membersihkan atau memposting status ke channel #${channelId}: ${err.message}`);
        // Melempar error kembali agar bisa ditangani oleh pemanggil (misal: /status command)
        throw err;
    }
}

module.exports = cleanupAndPostStatus;