const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const generateBookListEmbed = require('../../utils/postBookList');
const { handleInteractionError } = require('../../utils/errorHandler');
const { log } = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('postbooklist')
        .setDescription('Kirim daftar buku interaktif terbaru ke channel #daftar-buku')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction, client) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

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

        } catch (error) {
            log('ERROR', 'POST_BOOKLIST', error.message);
            await handleInteractionError(interaction);
        }
    },
};