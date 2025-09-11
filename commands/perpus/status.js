/*
================================================================================
File: 📁 smanung-library-bot/commands/perpus/status.js
Tujuan: Perintah manual untuk me-refresh/mengirim ulang pesan status.
================================================================================
*/
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const cleanupAndPostStatus = require('../../utils/cleanupAndPost');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('Membersihkan dan memperbarui pesan status peminjaman buku.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction, client) {
        if (!interaction.member.roles.cache.has(client.config.roles.adminPerpus)) {
            return interaction.reply({ content: '❌ Anda tidak memiliki izin untuk menggunakan perintah ini.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });
        try {
            await cleanupAndPostStatus(client, client.config.channels.statusBuku);
            await interaction.editReply('✅ Pesan status berhasil diperbarui.');
        } catch (error) {
            console.error('Gagal update status manual:', error);
            await interaction.editReply('❌ Gagal memperbarui status.');
        }
    },
};