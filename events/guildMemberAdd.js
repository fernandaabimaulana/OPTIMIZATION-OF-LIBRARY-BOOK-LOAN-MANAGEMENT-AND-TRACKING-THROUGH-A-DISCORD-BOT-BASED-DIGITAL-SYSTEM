const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { log } = require('../utils/logger');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member, client) {
        log('INFO', 'GUILD_MEMBER_ADD', `User ${member.user.tag} (ID: ${member.id}) bergabung dengan server.`);
        
        const db = client.db;
        const unverifiedRoleId = '1404769480386543717'; // Pastikan ini ID Role "Belum Terdaftar" Anda
        const registerChannelId = '1410599781038030936'; // Pastikan ini ID Channel #register-akun Anda
        const loginChannelId = '1410599781038030937';    // Pastikan ini ID Channel #login-akun Anda

        try {
            // 1. Berikan role "Belum Terdaftar" untuk identifikasi awal (jika diperlukan, pastikan ID role benar)
            // const role = member.guild.roles.cache.get(unverifiedRoleId);
            // if (role) {
            //     await member.roles.add(role);
            //     log('INFO', 'GUILD_MEMBER_ADD', `Role 'Belum Terdaftar' diberikan kepada ${member.user.tag}.`);
            // } else {
            //     log('WARN', 'GUILD_MEMBER_ADD', `Role 'Belum Terdaftar' (ID: ${unverifiedRoleId}) tidak ditemukan.`);
            // }

            // 2. Cek database
            log('INFO', 'GUILD_MEMBER_ADD', `Mencari pengguna dengan Discord ID: ${member.id} di database.`);
            const [existingUser] = await db.query('SELECT p.*, ds.nis, dga.nip FROM pengguna p LEFT JOIN detail_siswa ds ON p.id_pengguna = ds.id_pengguna LEFT JOIN detail_guru_admin dga ON p.id_pengguna = dga.id_pengguna WHERE p.discord_id = ?', [member.id]);

            const registerChannel = await member.guild.channels.fetch(registerChannelId).catch(() => null);
            const loginChannel = await member.guild.channels.fetch(loginChannelId).catch(() => null);

            if (existingUser && existingUser.length > 0) {
                // --- PENGGUNA LAMA (REJOIN) ---
                const dbUser = existingUser[0];
                log('INFO', 'GUILD_MEMBER_ADD', `Pengguna lama ditemukan: ${dbUser.nama_lengkap}. Membutuhkan persetujuan ulang.`);

                // Kirim notifikasi persetujuan ke channel laporanHarian
                const approvalChannelId = '1410599781343957101'; // Sesuai permintaan Anda
                log('INFO', 'GUILD_MEMBER_ADD', `DEBUG: Mencoba mengambil channel persetujuan dengan ID: ${approvalChannelId}`);
                try {
                    const approvalChannel = await member.guild.channels.fetch(approvalChannelId);
                    
                    if (!approvalChannel) {
                        log('ERROR', 'GUILD_MEMBER_ADD', `DEBUG: Channel persetujuan (ID: ${approvalChannelId}) tidak ditemukan atau bot tidak memiliki izin melihatnya.`);
                        return; // Hentikan jika channel tidak ditemukan
                    }
                    log('INFO', 'GUILD_MEMBER_ADD', `DEBUG: Channel persetujuan ditemukan: ${approvalChannel.name}. Mencoba mengirim pesan.`);

                    const reapprovalEmbed = new EmbedBuilder()
                        .setColor(0xFFD700)
                        .setTitle('Persetujuan Ulang Diperlukan')
                        .setAuthor({ name: member.user.tag, iconURL: member.displayAvatarURL() })
                        .setDescription(`Seorang anggota terdaftar telah bergabung kembali dan membutuhkan persetujuan ulang untuk verifikasi.`)
                        .addFields(
                            { name: 'Nama Lengkap', value: `> ${dbUser.nama_lengkap || 'Tidak ada'}`, inline: false },
                            { name: 'NIS/NIP', value: `> ${dbUser.tipe_pengguna === 'siswa' ? dbUser.nis : dbUser.nip || 'Tidak ada'}`,
 inline: false },
                            { name: 'Tipe Akun', value: `> ${dbUser.tipe_pengguna || 'Tidak ada'}`, inline: false },
                            { name: 'Email', value: `> ${dbUser.email || 'Tidak ada'}`, inline: false },
                            { name: 'Akun Discord', value: `> ${member}`, inline: false }
                        )
                        .setFooter({ text: `User ID: ${member.id}` })
                        .setTimestamp();

                    const actionRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`reapprove_member_${member.id}`)
                                .setLabel('Setujui & Beri Role')
                                .setStyle(ButtonStyle.Success),
                            new ButtonBuilder()
                                .setCustomId(`kick_member_${member.id}`)
                                .setLabel('Keluarkan')
                                .setStyle(ButtonStyle.Danger)
                        );
                    
                    await approvalChannel.send({ embeds: [reapprovalEmbed], components: [actionRow] });
                    log('INFO', 'GUILD_MEMBER_ADD', `DEBUG: Notifikasi persetujuan ulang untuk ${member.user.tag} berhasil dikirim ke channel ${approvalChannel.name}.`);

                } catch (error) {
                    log('ERROR', 'GUILD_MEMBER_ADD', `DEBUG: Gagal mengirim notifikasi persetujuan ke channel ${approvalChannelId}. Error: ${error.message}`);
                    log('ERROR', 'GUILD_MEMBER_ADD', `DEBUG: Pastikan bot memiliki izin 'View Channel' dan 'Send Messages' di channel tersebut.`);
                }

                // Kirim DM ke pengguna
                try {
                    await member.send({ content: 'Selamat datang kembali! Karena Anda bergabung kembali, akun Anda perlu disetujui ulang oleh admin untuk mendapatkan peran kembali. Mohon tunggu sebentar.' });
                } catch (dmError) {
                    log('WARN', 'GUILD_MEMBER_ADD', `Gagal mengirim DM ke ${member.user.tag}.`);
                }
            } else {
                // --- PENGGUNA BARU ---
                log('INFO', 'GUILD_MEMBER_ADD', `Pengguna baru terdeteksi: ${member.user.tag}.`);

                // Pastikan channel registrasi terlihat dan kirim pesan
                if (registerChannel) {
                    await registerChannel.permissionOverwrites.edit(member.id, { ViewChannel: true });

                    const welcomeEmbed = new EmbedBuilder()
                        .setColor(0xFFFF00)
                        .setTitle(`👋 Selamat Datang, ${member.user.username}!`)
                        .setDescription(
                            `Anda telah bergabung dengan server Perpustakaan SMAN Unggulan.\n\n` + 
                            `Untuk mendapatkan akses penuh ke server, silakan lakukan registrasi dengan mengetik perintah \
/register\
 di channel ini.`
                        )
                        .setThumbnail(member.user.displayAvatarURL())
                        .setTimestamp();
                
                    await registerChannel.send({ content: `${member}`, embeds: [welcomeEmbed] });
                }

                // Sembunyikan channel login untuk pengguna baru
                if (loginChannel) {
                    await loginChannel.permissionOverwrites.edit(member.id, { ViewChannel: false });
                }
            }

        } catch (error) {
            log('ERROR', 'GUILD_MEMBER_ADD', `Gagal memproses anggota baru ${member.user.tag}. Error: ${error.message}`);
        }
    }
};
