const { SlashCommandBuilder, PermissionsBitField, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-admin')
        .setDescription('Memberikan role kepada seorang member untuk menjadikannya admin.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator) // Izin dasar, dikunci lebih lanjut di execute
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Member yang akan dijadikan admin.')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Role yang akan diberikan (misal: Guru, Admin, dll).')
                .setRequired(true)),
    async execute(interaction, client) {
        // Kunci perintah ini hanya untuk Developer
        if (!interaction.member.roles.cache.has(client.config.roles.developer)) {
            return interaction.reply({ content: '❌ Perintah ini hanya untuk Developer.', flags: MessageFlags.Ephemeral });
        }

        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        const targetUser = interaction.options.getMember('user');
        const role = interaction.options.getRole('role');

        if (!targetUser) {
            return interaction.editReply({ content: 'User tidak ditemukan.', flags: [MessageFlags.Ephemeral] });
        }

        try {
            await targetUser.roles.add(role);
            await interaction.editReply({ content: `Berhasil menambahkan role **${role.name}** kepada **${targetUser.user.username}**.`, flags: [MessageFlags.Ephemeral] });
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: 'Terjadi kesalahan saat mencoba menambahkan role.', flags: [MessageFlags.Ephemeral] });
        }
    },
};
