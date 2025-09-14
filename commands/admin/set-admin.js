const { SlashCommandBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const { handleInteractionError } = require('../../utils/errorHandler');
const { log } = require('../../utils/logger');
const db = require('../../utils/db'); // ✅ Pastikan import db

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-admin')
        .setDescription('Memberikan role kepada seorang member untuk menjadikannya admin.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
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
            return interaction.editReply({ content: '❌ Perintah ini hanya untuk Developer.', flags: MessageFlags.Ephemeral });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const targetUser = interaction.options.getMember('user');
        const role = interaction.options.getRole('role');

        if (!targetUser) {
            return interaction.editReply({ content: 'User tidak ditemukan.', flags: MessageFlags.Ephemeral });
        }

        try {
            // --- Perbaikan: Pastikan pengguna ada di tabel `pengguna` sebelum diupdate ---
            const placeholderEmail = `${targetUser.id}@placeholder.discord`;
            const placeholderPass = 'credentials-not-set'; // Nilai placeholder karena tidak login via password

            await db.query(
                `INSERT IGNORE INTO pengguna (discord_id, nama_lengkap, email, password_hash, password_salt, tipe_pengguna, terverifikasi) VALUES (?, ?, ?, ?, ?, 'siswa', 1)`,
                [targetUser.id, targetUser.user.displayName, placeholderEmail, placeholderPass, placeholderPass]
            );
            log('INFO', 'SET_ADMIN', `Memastikan pengguna ${targetUser.user.tag} ada di tabel 'pengguna'.`);
            
            // --- Logika Asli: Memberikan role dan mengupdate tipe ---
            await targetUser.roles.add(role);

            let tipeBaru = null;
            if (role.id === client.config.roles.adminPerpus) tipeBaru = 'admin';
            else if (role.id === client.config.roles.guru) tipeBaru = 'guru';
            else if (role.id === client.config.roles.siswa) tipeBaru = 'siswa';

            if (tipeBaru) {
                await db.query('UPDATE pengguna SET tipe_pengguna = ? WHERE discord_id = ?', [tipeBaru, targetUser.id]);
                log('INFO', 'SET_ADMIN', `Database pengguna ${targetUser.user.tag} diupdate menjadi tipe '${tipeBaru}'.`);
            }

            await interaction.editReply({ content: `✅ Berhasil menambahkan role **${role.name}** kepada **${targetUser.user.username}** dan mengupdate database.`, flags: MessageFlags.Ephemeral });
        } catch (error) {
            log('ERROR', 'SET_ADMIN', error.message);
            await handleInteractionError(interaction);
        }
    },
};
