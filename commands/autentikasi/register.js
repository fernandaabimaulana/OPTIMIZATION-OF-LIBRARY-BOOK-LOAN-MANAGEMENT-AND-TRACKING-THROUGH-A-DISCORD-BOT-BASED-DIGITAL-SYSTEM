// commands/autentikasi/register.js
const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder, MessageFlags, ButtonBuilder, ButtonStyle } = require('discord.js');
const crypto = require('crypto');
const { log } = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('register')
        .setDescription('Mendaftarkan diri Anda sebagai siswa, guru, atau admin perpustakaan.'),

    async execute(interaction, client) {
        log('INFO', 'REGISTER', `User ${interaction.user.tag} memulai proses registrasi.`);
        const selectMenu = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('register_role_select')
                    .setPlaceholder('Pilih peran Anda...')
                    .addOptions([
                        { label: 'Siswa', description: 'Daftar sebagai siswa', value: 'siswa' },
                        { label: 'Guru', description: 'Daftar sebagai guru', value: 'guru' },
                    ]),
            );

        await interaction.reply({
            content: 'Silakan pilih peran Anda untuk memulai proses pendaftaran.',
            components: [selectMenu],
            flags: MessageFlags.Ephemeral,
        });
    },

    async handleSelectMenu(interaction, client) {
        const role = interaction.values[0];
        log('INFO', 'REGISTER', `User ${interaction.user.tag} memilih peran '${role}'. Menampilkan modal.`);
        
        const idInputLabel = role === 'siswa' ? "Nomor Induk Siswa (NIS)" : "Nomor Induk Pegawai (NIP)";
        const idInputCustomId = role === 'siswa' ? "nis_input" : "nip_input";

        const modal = new ModalBuilder()
            .setCustomId(`register_modal_${role}`)
            .setTitle(`Form Pendaftaran - ${role.charAt(0).toUpperCase() + role.slice(1)}`);

        const idInput = new TextInputBuilder().setCustomId(idInputCustomId).setLabel(idInputLabel).setStyle(TextInputStyle.Short).setRequired(true);
        const namaInput = new TextInputBuilder().setCustomId('nama_input').setLabel("Nama Lengkap").setStyle(TextInputStyle.Short).setRequired(true);
        const emailInput = new TextInputBuilder().setCustomId('email_input').setLabel("Email Aktif").setStyle(TextInputStyle.Short).setRequired(true);
        const passwordInput = new TextInputBuilder().setCustomId('password_input').setLabel("Password").setStyle(TextInputStyle.Short).setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(idInput),
            new ActionRowBuilder().addComponents(namaInput),
            new ActionRowBuilder().addComponents(emailInput),
            new ActionRowBuilder().addComponents(passwordInput)
        );

        await interaction.showModal(modal);
    },

    async handleModalSubmit(interaction, client) {
        if (!interaction.inGuild()) {
            return interaction.reply({ content: 'Perintah ini hanya bisa digunakan di dalam server.', flags: MessageFlags.Ephemeral });
        }
        
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const role = interaction.customId.split('_')[2];
        const namaLengkap = interaction.fields.getTextInputValue('nama_input');
        const email = interaction.fields.getTextInputValue('email_input');
        const password = interaction.fields.getTextInputValue('password_input');
        const idNumber = interaction.fields.getTextInputValue(role === 'siswa' ? 'nis_input' : 'nip_input');

        log('INFO', 'REGISTER', `Menerima submit modal dari ${interaction.user.tag} untuk peran '${role}' dengan email ${email}.`);

        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto.scryptSync(password, salt, 64).toString('hex');

        const db = client.db;
        try {
            await db.query('START TRANSACTION');

            const [[existingUser]] = await db.query('SELECT email FROM pengguna WHERE email = ?', [email]);
            if (existingUser) {
                await db.query('ROLLBACK');
                log('WARN', 'REGISTER', `Registrasi gagal untuk email ${email}. Email sudah terdaftar.`);
                return interaction.editReply({ content: '❌ Email ini sudah terdaftar. Silakan gunakan email lain.' });
            }

            const [result] = await db.query(
                'INSERT INTO pengguna (nama_lengkap, email, password_hash, password_salt, tipe_pengguna, discord_id) VALUES (?, ?, ?, ?, ?, ?)',
                [namaLengkap, email, hash, salt, role, interaction.user.id]
            );
            const idPengguna = result.insertId;
            log('INFO', 'REGISTER_DB', `Data pengguna baru (ID: ${idPengguna}, Email: ${email}) berhasil dimasukkan ke tabel pengguna.`);

            if (role === 'siswa') {
                await db.query('INSERT INTO detail_siswa (id_pengguna, nis) VALUES (?, ?)', [idPengguna, idNumber]);
            } else {
                await db.query('INSERT INTO detail_guru_admin (id_pengguna, nip) VALUES (?, ?)', [idPengguna, idNumber]);
            }
            log('INFO', 'REGISTER_DB', `Detail ${role} untuk pengguna ID ${idPengguna} berhasil disimpan.`);

            await db.query('COMMIT');
            
            const unverifiedRoleId = '1410599779469234264';
            try {
                await interaction.member.roles.add(unverifiedRoleId);
                log('INFO', 'REGISTER_ROLE', `Role 'Belum Terdaftar' berhasil diberikan kepada ${interaction.user.tag}.`);
            } catch (roleError) {
                log('ERROR', 'REGISTER_ROLE', `Gagal memberikan role 'Belum Terdaftar' untuk ${interaction.user.tag}. Error: ${roleError.message}`);
                // This is not a critical error, but we should log it. The user can still be verified manually.
            }

            // Notify admins for verification
            const verificationEmbed = new EmbedBuilder()
                .setColor('Yellow')
                .setTitle('🔔 Pendaftaran Baru Memerlukan Verifikasi')
                .setDescription(`Pengguna baru telah mendaftar dan memerlukan verifikasi manual.`)
                .addFields(
                    { name: 'Pengguna', value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: true },
                    { name: 'Mendaftar Sebagai', value: role.charAt(0).toUpperCase() + role.slice(1), inline: true },
                    { name: 'Nama Lengkap', value: namaLengkap },
                    { name: 'Email', value: email },
                    { name: 'NIS/NIP', value: idNumber }
                )
                .setTimestamp();

            const verificationButtons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`verify_approve_${interaction.user.id}`)
                        .setLabel('Setujui')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder() 
                        .setCustomId(`verify_reject_${interaction.user.id}`)
                        .setLabel('Tolak')
                        .setStyle(ButtonStyle.Danger)
                );

            try {
                const logChannel = await client.channels.fetch(client.config.channels.botLogs);
                if (logChannel) {
                    await logChannel.send({ embeds: [verificationEmbed], components: [verificationButtons] });
                    log('INFO', 'REGISTER_NOTIFY', `Notifikasi verifikasi untuk ${interaction.user.tag} telah dikirim ke channel log.`);
                }
            } catch (notifyError) {
                log('ERROR', 'REGISTER_NOTIFY', `Gagal mengirim notifikasi verifikasi ke channel log. Error: ${notifyError.message}`);
            }

            // Reply to user
            const successEmbed = new EmbedBuilder()
                .setColor('Green')
                .setTitle('✅ Registrasi Tahap Awal Berhasil!')
                .setDescription(`Terima kasih, **${namaLengkap}**! Data Anda telah berhasil disimpan.

Akun Anda sekarang sedang menunggu persetujuan dari Admin. Anda akan menerima notifikasi jika akun Anda telah diaktifkan.`);
            
            await interaction.editReply({ embeds: [successEmbed] });
            log('INFO', 'REGISTER', `Registrasi untuk ${interaction.user.tag} (Email: ${email}) selesai dengan sukses.`);

             // --- AWAL TAMBAHAN: Kunci channel registrasi ---
            try {
                const registerChannelId = '1410599781038030936'; // ID channel #register-akun
                const registerChannel = await interaction.guild.channels.fetch(registerChannelId);
                if (registerChannel) {
                    await registerChannel.permissionOverwrites.edit(interaction.user.id, {
                        ViewChannel: false
                    });
                    log('INFO', 'REGISTER_LOCK', `Channel #${registerChannel.name} berhasil disembunyikan untuk ${interaction.user.tag}.`);
                }
            } catch (permError) {
                log('ERROR', 'REGISTER_LOCK', `Gagal menyembunyikan channel registrasi untuk ${interaction.user.tag}. Error: ${permError.message}`);
                // Gagal mengubah izin bukan masalah kritis, cukup catat di log.
            }
            // --- AKHIR TAMBAHAN ---

        } catch (error) {
            await db.query('ROLLBACK');
            log('ERROR', 'REGISTER_DB', `Error saat registrasi untuk email ${email}. Error: ${error.message}`);
            
            if (error.code === 'ER_DUP_ENTRY') {
                return interaction.editReply({ content: `❌ Gagal mendaftar. Akun Discord ini '${idNumber}' sudah digunakan, silahkan login dengan mengetik "/login"` });
            }
            
            await interaction.editReply({ content: '❌ Terjadi kesalahan pada database. Hubungi admin jika masalah berlanjut.' });
        }
    },

    async handleButton(interaction, client) {
        const [action, targetUserId] = interaction.customId.split('_').slice(1);
        const adminMember = interaction.member;

        log('INFO', 'VERIFY_BUTTON', `Admin ${adminMember.user.tag} menekan tombol '${action}' untuk user ID ${targetUserId}.`);

        await interaction.deferUpdate();

        const db = client.db;
        const originalMessage = interaction.message;
        const originalEmbed = originalMessage.embeds[0];

        try {
            const targetMember = await interaction.guild.members.fetch(targetUserId);
            if (!targetMember) {
                const editedEmbed = EmbedBuilder.from(originalEmbed).setColor('Grey').setTitle('⚠️ Pengguna Tidak Ditemukan').setDescription('Pengguna yang mengajukan pendaftaran sudah keluar dari server.').setFooter({ text: `Aksi dibatalkan oleh sistem.` });
                return interaction.message.edit({ embeds: [editedEmbed], components: [] });
            }

            const [[user]] = await db.query('SELECT * FROM pengguna WHERE discord_id = ?', [targetUserId]);
            if (!user) {
                const editedEmbed = EmbedBuilder.from(originalEmbed).setColor('Grey').setTitle('⚠️ Pengguna Tidak Ditemukan').setDescription('Data pendaftaran pengguna ini tidak ditemukan di database (kemungkinan sudah ditolak atau dibatalkan). ').setFooter({ text: `Aksi dibatalkan oleh sistem.` });
                return interaction.message.edit({ embeds: [editedEmbed], components: [] });
            }

            const editedEmbed = EmbedBuilder.from(originalEmbed);
            
            if (action === 'approve') {
                await db.query('UPDATE pengguna SET terverifikasi = 1 WHERE discord_id = ?', [targetUserId]);

                const siswaRoleId = '1410599779469234263';
                const guruRoleId = '1410599779469234262';
                const unverifiedRoleId = '1410599779469234264';
                
                let roleToAssign, roleName;
                if (user.tipe_pengguna === 'siswa') { roleToAssign = siswaRoleId; roleName = 'Siswa'; }
                if (user.tipe_pengguna === 'guru') { roleToAssign = guruRoleId; roleName = 'Guru'; }

                if (roleToAssign) {
                    await targetMember.roles.add(roleToAssign);
                }
                await targetMember.roles.remove(unverifiedRoleId);
                
                editedEmbed.setColor('Green')
                    .setTitle('✅ Pendaftaran Disetujui')
                    .setFooter({ text: `Disetujui oleh ${adminMember.user.tag}` });
                
                await originalMessage.edit({ embeds: [editedEmbed], components: [] });
                
                try {
                    await targetMember.send(`Selamat! Pendaftaran Anda sebagai **${roleName}** telah disetujui oleh admin. Anda sekarang memiliki akses penuh ke fitur perpustakaan.`);
                } catch (dmError) {
                    log('WARN', 'VERIFY_DM', `Gagal mengirim DM ke ${targetMember.user.tag}.`);
                }
                log('INFO', 'VERIFY_APPROVE', `User ${targetMember.user.tag} disetujui oleh ${adminMember.user.tag}.`);

            } else if (action === 'reject') {
                await db.query('DELETE FROM pengguna WHERE discord_id = ?', [targetUserId]);
                await db.query('DELETE FROM detail_siswa WHERE id_pengguna = ?', [user.id_pengguna]);
                await db.query('DELETE FROM detail_guru_admin WHERE id_pengguna = ?', [user.id_pengguna]);


                editedEmbed.setColor('Red')
                    .setTitle('❌ Pendaftaran Ditolak')
                    .setFooter({ text: `Ditolak oleh ${adminMember.user.tag}` });

                await originalMessage.edit({ embeds: [editedEmbed], components: [] });

                try {
                    await targetMember.send(`Mohon maaf, pendaftaran Anda telah ditolak oleh admin.`);
                } catch (dmError) {
                    log('WARN', 'VERIFY_DM', `Gagal mengirim DM ke ${targetMember.user.tag}.`);
                }
                log('INFO', 'VERIFY_REJECT', `User ${targetMember.user.tag} ditolak oleh ${adminMember.user.tag}.`);
            }
        } catch (error) {
            log('ERROR', 'VERIFY_BUTTON', `Error saat memproses tombol verifikasi: ${error.message}`);
            const logChannel = await client.channels.fetch(client.config.channels.botLogs);
            if (logChannel) {
                logChannel.send(`Terjadi kesalahan saat admin ${adminMember.user.tag} mencoba memverifikasi pengguna: ${error.message}`);
            }
        }
    }
};