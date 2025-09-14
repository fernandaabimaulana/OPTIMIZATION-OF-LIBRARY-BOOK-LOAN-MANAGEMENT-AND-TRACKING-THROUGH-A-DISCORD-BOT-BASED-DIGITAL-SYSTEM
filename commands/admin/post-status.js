const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const cleanupAndPostStatus = require('../../utils/cleanupAndPost');
const { handleInteractionError } = require('../../utils/errorHandler');
const { log } = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('poststatus')
        .setDescription('Membersihkan dan mengirim ulang status peminjaman buku ke channel status.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction, client) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        try {
            await cleanupAndPostStatus(client, client.config.channels.statusBuku);
            await interaction.editReply({ content: '✅ Status peminjaman berhasil diposting ulang.' });
        } catch (error) {
            log('ERROR', 'POST_STATUS', error.message);
            await handleInteractionError(interaction);
        }
    },
};