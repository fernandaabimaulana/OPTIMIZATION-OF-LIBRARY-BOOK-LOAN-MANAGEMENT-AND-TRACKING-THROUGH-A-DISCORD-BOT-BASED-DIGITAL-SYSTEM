const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const generateBookListEmbed = require('../../utils/postBookList');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('postbooklist')
        .setDescription('Kirim daftar buku interaktif terbaru ke channel #daftar-buku')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: true });
        
        const channelId = '1410599781038030932'; // Pastikan ID Channel sudah benar

        try {
            const channel = await client.channels.fetch(channelId);
            if (!channel) {
                return interaction.editReply({ content: `❌ Channel dengan ID ${channelId} tidak ditemukan.` });
            }

            // Hapus pesan lama dari bot di channel (opsional, tapi disarankan)
            const messages = await channel.messages.fetch({ limit: 50 });
            const botMessages = messages.filter(m => m.author.id === client.user.id);
            if (botMessages.size > 0) {
               await channel.bulkDelete(botMessages, true);
            }

            // Generate dan kirim halaman pertama
            const bookListMessage = await generateBookListEmbed(client, 1);
            await channel.send(bookListMessage);

            await interaction.editReply({ content: '✅ Daftar buku interaktif berhasil dikirim!' });

        } catch (err) {
            console.error('[BOOKLIST] Gagal mengirim daftar buku:', err);
            await interaction.editReply({ content: '❌ Gagal mengirim daftar buku.' });
        }
    },
};
/*const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const postBookList = require('../../utils/postBookList');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('postbooklist')
        .setDescription('Kirim daftar buku terbaru ke channel #daftar-buku')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction, client) {
        await interaction.deferReply({ flags: 64 });
        try {
            await postBookList(client);
            await interaction.editReply({ content: '✅ Daftar buku berhasil dikirim ke channel #daftar-buku.' });
        } catch (err) {
            console.error('[BOOKLIST] Gagal mengirim daftar buku:', err);
            await interaction.editReply({ content: '❌ Gagal mengirim daftar buku.' });
        }
    },
};*/