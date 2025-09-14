const { SlashCommandBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const { handleInteractionError } = require('../../utils/errorHandler'); // ✅ Tambah helper
const { log } = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove-role')
        .setDescription('Menghapus role dari seorang member.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator) // Izin dasar, dikunci lebih lanjut di execute
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Member yang rolenya akan dihapus.')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Role yang akan dihapus dari member.')
                .setRequired(true)),

    async execute(interaction, client) {
        // Kunci perintah ini hanya untuk Developer
        if (!interaction.member.roles.cache.has(client.config.roles.developer)) {
            return interaction.editReply({ content: '❌ Perintah ini hanya untuk Developer.', flags: MessageFlags.Ephemeral });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const targetUser = interaction.options.getMember('user');
        const role = interaction.options.getRole('role');

        if (!targetUser) {
            return interaction.editReply({ content: 'User tidak ditemukan.' });
        }

        // Periksa apakah member memiliki role tersebut sebelum mencoba menghapus
        if (!targetUser.roles.cache.has(role.id)) {
            return interaction.editReply({ content: `❌ Member tersebut tidak memiliki role **${role.name}**.` });
        }

        try {
            await targetUser.roles.remove(role);
            await interaction.editReply({ content: `✅ Berhasil menghapus role **${role.name}** dari **${targetUser.user.username}**.` });
        } catch (error) {
            log('ERROR', 'REMOVE_ROLE', error.message);
            await handleInteractionError(interaction);
        }
    },
};
