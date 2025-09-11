const { SlashCommandBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder, MessageFlags } = require('discord.js');
const crypto = require('crypto');
const { log } = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('login')
        .setDescription('Login untuk verifikasi akun Anda.'),

    async execute(interaction, client) {
        // --- AWAL TAMBAHAN: Cek jika pengguna sudah login (memiliki peran) ---
        const member = interaction.member;
        const siswaRoleId = '1410599779469234263';
        const guruRoleId = '1410599779469234262';
        const adminRoleId = client.config.roles.adminPerpus; // Pastikan ini terdefinisi di config.json

        if (member.roles.cache.has(siswaRoleId) || member.roles.cache.has(guruRoleId) || member.roles.cache.has(adminRoleId)) {
            log('INFO', 'LOGIN_ATTEMPT', `User ${interaction.user.tag} yang sudah memiliki peran mencoba login kembali.`);
            return interaction.reply({
                content: 'Anda sudah login dan terverifikasi. Tidak perlu login lagi.',
                flags: MessageFlags.Ephemeral
            });
        }
        // --- AKHIR TAMBAHAN ---

        log('INFO', 'LOGIN', `User ${interaction.user.tag} memulai proses login.`);
        const modal = new ModalBuilder()
            .setCustomId('login_modal')
            .setTitle('Form Login');

        const emailInput = new TextInputBuilder()
            .setCustomId('login_email')
            .setLabel("Email")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const passwordInput = new TextInputBuilder()
            .setCustomId('login_password')
            .setLabel("Password")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(emailInput),
            new ActionRowBuilder().addComponents(passwordInput)
        );

        await interaction.showModal(modal);
    },

    async handleModalSubmit(interaction, client) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const email = interaction.fields.getTextInputValue('login_email');
        const password = interaction.fields.getTextInputValue('login_password');
        const db = client.db;
        log('INFO', 'LOGIN', `Menerima submit modal login dari ${interaction.user.tag} untuk email ${email}.`);

        try {
            const [rows] = await db.query('SELECT * FROM pengguna WHERE email = ?', [email]);

            if (rows.length === 0) {
                log('WARN', 'LOGIN', `Login gagal untuk email ${email}. Email tidak ditemukan.`);
                return interaction.editReply({ content: '❌ Email atau password salah.' });
            }

            const user = rows[0];

            const hash = crypto.scryptSync(password, user.password_salt, 64).toString('hex');

            if (hash !== user.password_hash) {
                log('WARN', 'LOGIN', `Login gagal untuk email ${email}. Password salah.`);
                return interaction.editReply({ content: '❌ Email atau password salah.' });
            }

            // Check if user is verified
            if (user.terverifikasi !== 1) {
                log('WARN', 'LOGIN', `Login gagal untuk email ${email}. Akun belum diverifikasi.`);
                return interaction.editReply({ content: '⚠️ Akun Anda belum diverifikasi oleh admin. Mohon tunggu persetujuan pendaftaran Anda.' });
            }

            if (user.discord_id !== interaction.user.id) {
                log('INFO', 'LOGIN_DB', `Discord ID untuk user ${user.nama_lengkap} (Email: ${email}) tidak cocok. Mengupdate dari ${user.discord_id} ke ${interaction.user.id}.`);
                await db.query('UPDATE pengguna SET discord_id = ? WHERE id_pengguna = ?', [interaction.user.id, user.id_pengguna]);
            }

            try {
                const member = interaction.member;
                const siswaRoleId = '1410599779469234263';
                const guruRoleId = '1410599779469234262';
                const adminRoleId = client.config.roles.adminPerpus;
                const unverifiedRoleId = '1410599779469234264';

                let roleToAssign, roleName;
                switch (user.tipe_pengguna) {
                    case 'siswa': roleToAssign = siswaRoleId; roleName = 'Siswa'; break;
                    case 'guru': roleToAssign = guruRoleId; roleName = 'Guru'; break;
                    case 'admin': roleToAssign = adminRoleId; roleName = 'Admin Perpustakaan'; break;
                }

                if (roleToAssign) {
                    await member.roles.add(roleToAssign);
                    log('INFO', 'LOGIN_ROLE', `Role '${roleName}' berhasil diberikan kepada ${interaction.user.tag}.`);
                }

                if (member.roles.cache.has(unverifiedRoleId)) {
                    await member.roles.remove(unverifiedRoleId);
                    log('INFO', 'LOGIN_ROLE', `Role 'Belum Terdaftar' berhasil dihapus dari ${interaction.user.tag}.`);
                }

            } catch (roleError) {
                log('ERROR', 'LOGIN_ROLE', `Gagal mengatur role untuk ${interaction.user.tag} saat login. Error: ${roleError.message}`);
                const partialSuccessEmbed = new EmbedBuilder()
                    .setColor(0xFFD700)
                    .setTitle('✅ Login Database Berhasil')
                    .setDescription(`Selamat datang kembali, **${user.nama_lengkap}**! Data Anda cocok.`)
                    .addFields({ name: '⚠️ Peringatan', value: 'Gagal memperbarui role Anda secara otomatis. Mohon hubungi admin.' });
                
                return interaction.editReply({ embeds: [partialSuccessEmbed] });
            }
            
            const successEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ Login Berhasil!')
                .setDescription(`Selamat datang kembali, **${user.nama_lengkap}**! Akun dan role Anda telah berhasil dipulihkan.`);

            await interaction.editReply({ embeds: [successEmbed] });
            log('INFO', 'LOGIN', `User ${user.nama_lengkap} (Email: ${email}) berhasil login dan diverifikasi.`);

        } catch (error) {
            log('ERROR', 'LOGIN', `Terjadi kesalahan internal saat proses login untuk email ${email}. Error: ${error.message}`);
            await interaction.editReply({ content: '❌ Terjadi kesalahan internal saat mencoba login.' });
        }
    }
};