// commands/autentikasi/register.js
const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder, MessageFlags, ButtonBuilder, ButtonStyle } = require('discord.js');
const crypto = require('crypto');
const { log } = require('../../utils/logger');
const { handleInteractionError } = require('../../utils/errorHandler'); // ✅ Tambah helper

module.exports = {
    data: new SlashCommandBuilder()
        .setName('register')
        .setDescription('Mendaftarkan diri Anda sebagai siswa, guru, atau admin perpustakaan.'),

    async execute(interaction, client) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        try {
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

            await interaction.editReply({
                content: 'Silakan pilih peran Anda untuk memulai proses pendaftaran.',
                components: [selectMenu],
                flags: MessageFlags.Ephemeral,
            });
        } catch (error) {
            log('ERROR', 'REGISTER', error.message);
            await handleInteractionError(interaction);
        }
    },

    async handleSelectMenu(interaction, client) {
        try {
            const role = interaction.values[0];
            log('INFO', 'REGISTER', `User ${interaction.user.tag} memilih peran '${role}'. Menampilkan modal.`);
            
            const idInputLabel = role === 'siswa' ? "Nomor Induk Siswa Nasional (NISN)" : "Nomor Induk Pegawai (NIP)";
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
        } catch (error) {
            log('ERROR', 'REGISTER_SELECTMENU', error.message);
            await handleInteractionError(interaction);
        }
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
                const logChannel = await client.channels.fetch('1410599781343957101');
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
                const registerChannelId = '1410599781038030936';
                const registerChannel = await interaction.guild.channels.fetch(registerChannelId);
                if (registerChannel) {
                    await registerChannel.permissionOverwrites.edit(interaction.user.id, {
                        ViewChannel: false
                    });
                    log('INFO', 'REGISTER_LOCK', `Channel #${registerChannel.name} berhasil disembunyikan untuk ${interaction.user.tag}.`);
                }
            } catch (permError) {
                log('ERROR', 'REGISTER_LOCK', `Gagal menyembunyikan channel registrasi untuk ${interaction.user.tag}. Error: ${permError.message}`);
            }
            // --- AKHIR TAMBAHAN ---

        } catch (error) {
            await db.query('ROLLBACK');
            log('ERROR', 'REGISTER_DB', `Error saat registrasi untuk email ${email}. Error: ${error.message}`);
            await handleInteractionError(interaction);
        }
    },

    async handleButton(interaction, client) {
        const [action, targetUserId] = interaction.customId.split('_').slice(1);
        const adminMember = interaction.member;

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
                    const approvalEmbed = new EmbedBuilder()
                        .setColor(0x00FF00)
                        .setTitle('✅ Pendaftaran Anda Disetujui!')
                        .setDescription(`Selamat! Pendaftaran Anda sebagai **${roleName}** telah disetujui oleh admin.
Anda sekarang memiliki akses penuh ke fitur perpustakaan. Selamat menjelajahi!`)
                        .setTimestamp();
                    await targetMember.send({ embeds: [approvalEmbed] });
                } catch (dmError) {
                    log('WARN', 'VERIFY_DM', `Gagal mengirim DM persetujuan ke ${targetMember.user.tag}.`);
                }
                log('INFO', 'VERIFY_APPROVE', `User ${targetMember.user.tag} disetujui oleh ${adminMember.user.tag}.`);

            } else if (action === 'reject') {
                const editedEmbed = EmbedBuilder.from(originalEmbed)
                    .setColor('Red')
                    .setTitle('❌ Pendaftaran Ditolak')
                    .setDescription(`Pendaftaran dari <@${targetUserId}> ditolak oleh ${adminMember.user.tag}. 
Silakan periksa kembali data Anda dan ajukan registrasi ulang.`)
                    .setFooter({ text: `Ditolak oleh ${adminMember.user.tag}` })
                    .setTimestamp();

                await originalMessage.edit({ embeds: [editedEmbed], components: [] });

                // Hapus data dari database
                try {
                    await db.query('DELETE FROM detail_siswa WHERE id_pengguna = ?', [user.id_pengguna]);
                    await db.query('DELETE FROM detail_guru_admin WHERE id_pengguna = ?', [user.id_pengguna]);
                    await db.query('DELETE FROM pengguna WHERE id_pengguna = ?', [user.id_pengguna]);
                    log('INFO', 'REGISTER_REJECT_DB', `Data pendaftaran user ${targetMember.user.tag} dihapus dari database.`);
                } catch (dbError) {
                    log('ERROR', 'REGISTER_REJECT_DB', `Gagal menghapus data user ${targetMember.user.tag} dari DB. Error: ${dbError.message}`);
                }

                // Kirim DM ke user
                try {
                    await targetMember.send(`❌ Pendaftaran Anda ditolak oleh admin **${adminMember.user.tag}**. Silakan daftar ulang dengan data yang benar di server.`);
                } catch (dmError) {
                    log('WARN', 'REGISTER_REJECT_DM', `Gagal kirim DM ke ${targetMember.user.tag}`);
                }

                // Buka kembali channel register
                try {
                    const registerChannelId = '1410599781038030936';
                    const registerChannel = await interaction.guild.channels.fetch(registerChannelId);
                    if (registerChannel) {
                        await registerChannel.permissionOverwrites.edit(targetUserId, {
                            ViewChannel: true
                        });
                        log('INFO', 'REGISTER_UNLOCK', `Channel #${registerChannel.name} dibuka kembali untuk ${targetMember.user.tag}.`);
                    }
                } catch (permError) {
                    log('ERROR', 'REGISTER_UNLOCK', `Gagal membuka channel registrasi kembali untuk ${targetMember.user.tag}. Error: ${permError.message}`);
                }

                // Pastikan role "Belum Terdaftar" tetap ada
                const unverifiedRoleId = '1410599779469234264';
                if (!targetMember.roles.cache.has(unverifiedRoleId)) {
                    await targetMember.roles.add(unverifiedRoleId).catch(() => {});
                }
            }
        } catch (error) {
            log('ERROR', 'VERIFY_BUTTON', `Error saat memproses tombol verifikasi: ${error.message}`);
            await handleInteractionError(interaction);
        }
    }
};