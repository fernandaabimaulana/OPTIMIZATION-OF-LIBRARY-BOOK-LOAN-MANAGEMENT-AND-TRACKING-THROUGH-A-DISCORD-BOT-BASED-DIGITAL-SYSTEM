/*
================================================================================
File: 📁 smanung-library-bot/commands/perpus/status.js
Tujuan: Perintah manual untuk me-refresh/mengirim ulang pesan status.
================================================================================
*/
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const cleanupAndPostStatus = require('../../utils/cleanupAndPost');
const { handleInteractionError } = require('../../utils/errorHandler');
const { log } = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('Membersihkan dan memperbarui pesan status peminjaman buku.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction, client) {
        if (!interaction.member.roles.cache.has(client.config.roles.adminPerpus)) {
            return interaction.editReply({ content: '❌ Anda tidak memiliki izin untuk menggunakan perintah ini.', flags: MessageFlags.Ephemeral });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        try {
            await cleanupAndPostStatus(client, client.config.channels.statusBuku);
            await interaction.editReply({ content: '✅ Pesan status berhasil diperbarui.' });
        } catch (error) {
            log('ERROR', 'STATUS_COMMAND', error.message);
            await interaction.editReply({ content: '❌ Gagal memperbarui status.', flags: MessageFlags.Ephemeral });
        }
    },
};