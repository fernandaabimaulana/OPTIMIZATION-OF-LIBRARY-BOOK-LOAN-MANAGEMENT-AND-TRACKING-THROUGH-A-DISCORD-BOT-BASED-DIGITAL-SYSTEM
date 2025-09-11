const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const cleanupAndPostStatus = require('../../utils/cleanupAndPost');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('poststatus')
        .setDescription('Membersihkan dan mengirim ulang status peminjaman buku ke channel status.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: true });
        try {
            await cleanupAndPostStatus(client, client.config.channels.statusBuku);
            await interaction.editReply({ content: '✅ Status peminjaman berhasil diposting ulang.' });
        } catch (err) {
            // Error sudah di-log di dalam cleanupAndPostStatus
            console.error('[POST-STATUS] Gagal menjalankan cleanup and post:', err);
            await interaction.editReply({ content: '❌ Gagal memposting ulang status peminjaman.' });
        }
    },
};