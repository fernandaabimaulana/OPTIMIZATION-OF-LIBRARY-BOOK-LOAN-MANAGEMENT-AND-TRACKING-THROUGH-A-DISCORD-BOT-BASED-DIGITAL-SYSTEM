const { SlashCommandBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder, MessageFlags } = require('discord.js');
const crypto = require('crypto');
const { log } = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lupa_password')
        .setDescription('Memulai proses reset password untuk akun Anda.'),

    async execute(interaction, client) {
        log('INFO', 'FORGOT_PASSWORD', `User ${interaction.user.tag} memulai proses lupa password.`);
        const modal = new ModalBuilder()
            .setCustomId('lupa_password_modal')
            .setTitle('Form Lupa Password');

        const emailInput = new TextInputBuilder()
            .setCustomId('lupa_password_email')
            .setLabel("Masukkan Email Terdaftar Anda")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(emailInput));

        await interaction.showModal(modal);
    },

    async handleModalSubmit(interaction, client) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const email = interaction.fields.getTextInputValue('lupa_password_email');
        const db = client.db;
        log('INFO', 'FORGOT_PASSWORD', `Menerima submit modal lupa password dari ${interaction.user.tag} untuk email ${email}.`);

        try {
            const [rows] = await db.query('SELECT id_pengguna, nama_lengkap, discord_id, password_salt FROM pengguna WHERE email = ?', [email]);

            if (rows.length === 0) {
                log('WARN', 'FORGOT_PASSWORD', `Reset password gagal untuk email ${email}. Email tidak ditemukan.`);
                return interaction.editReply({ content: '❌ Email tidak ditemukan di database.' });
            }

            const user = rows[0];
            const existingSalt = user.password_salt;

            if (!existingSalt) {
                log('ERROR', 'FORGOT_PASSWORD', `Akun untuk email ${email} (ID: ${user.id_pengguna}) tidak memiliki salt.`);
                return interaction.editReply({ content: '❌ Akun Anda memiliki data yang tidak valid (salt tidak ditemukan). Hubungi admin.' });
            }

            const newPassword = crypto.randomBytes(8).toString('hex');
            const newHash = crypto.scryptSync(newPassword, existingSalt, 64).toString('hex');

            await db.query('UPDATE pengguna SET password_hash = ? WHERE id_pengguna = ?', [newHash, user.id_pengguna]);
            log('INFO', 'FORGOT_PASSWORD_DB', `Password untuk user ${user.nama_lengkap} (Email: ${email}) berhasil di-reset di database.`);

            try {
                const discordUser = await client.users.fetch(user.discord_id);
                const dmEmbed = new EmbedBuilder()
                    .setColor(0xFFFF00)
                    .setTitle('🔑 Reset Password Berhasil')
                    .setDescription('Password Anda telah berhasil di-reset. Berikut adalah password baru Anda:')
                    .addFields({ name: 'Password Baru', value: `\`${newPassword}\`` })
                    .setFooter({ text: 'Segera login dan ganti password Anda demi keamanan.' });
                
                await discordUser.send({ embeds: [dmEmbed] });
                log('INFO', 'FORGOT_PASSWORD_DM', `Password baru berhasil dikirim ke DM user ${discordUser.tag}.`);

                await interaction.editReply({ content: '✅ Password baru telah dikirim ke DM Anda. Silakan periksa.' });

            } catch (dmError) {
                log('ERROR', 'FORGOT_PASSWORD_DM', `Gagal mengirim DM ke user ${user.nama_lengkap} (Discord ID: ${user.discord_id}). Error: ${dmError.message}`);
                await interaction.editReply({ content: '❌ Gagal mengirim password baru ke DM Anda. Pastikan DM Anda terbuka untuk bot ini.' });
            }

        } catch (error) {
            log('ERROR', 'FORGOT_PASSWORD', `Terjadi kesalahan internal saat proses lupa password untuk email ${email}. Error: ${error.message}`);
            await interaction.editReply({ content: '❌ Terjadi kesalahan internal saat proses reset password.' });
        }
    }
};