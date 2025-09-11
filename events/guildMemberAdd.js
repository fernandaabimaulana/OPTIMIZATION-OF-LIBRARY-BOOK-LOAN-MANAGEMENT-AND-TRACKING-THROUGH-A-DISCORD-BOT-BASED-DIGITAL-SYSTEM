const { Events, EmbedBuilder } = require('discord.js');
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
            // 1. Berikan role "Belum Terdaftar" untuk identifikasi awal
            const role = member.guild.roles.cache.get(unverifiedRoleId);
            if (role) {
                await member.roles.add(role);
                log('INFO', 'GUILD_MEMBER_ADD', `Role 'Belum Terdaftar' diberikan kepada ${member.user.tag}.`);
            } else {
                log('WARN', 'GUILD_MEMBER_ADD', `Role 'Belum Terdaftar' (ID: ${unverifiedRoleId}) tidak ditemukan.`);
            }

            // 2. Cek apakah member sudah ada di database
            const [existingUser] = await db.query('SELECT id_pengguna FROM pengguna WHERE discord_id = ?', [member.id]);

            const registerChannel = await member.guild.channels.fetch(registerChannelId).catch(() => null);
            const loginChannel = await member.guild.channels.fetch(loginChannelId).catch(() => null);

            if (existingUser && existingUser.length > 0) {
                // --- PENGGUNA LAMA (REJOIN) ---
                log('INFO', 'GUILD_MEMBER_ADD', `Pengguna lama terdeteksi: ${member.user.tag}.`);

                // Sembunyikan channel registrasi
                if (registerChannel) {
                    await registerChannel.permissionOverwrites.edit(member.id, { ViewChannel: false });
                }
                
                // Pastikan channel login terlihat dan kirim pesan
                if (loginChannel) {
                    await loginChannel.permissionOverwrites.edit(member.id, { ViewChannel: true });
                    
                    const welcomeBackEmbed = new EmbedBuilder()
                        .setColor(0x0099FF)
                        .setTitle(`👋 Selamat Datang Kembali, ${member.user.username}!`)
                        .setDescription(
                            `Sistem kami mendeteksi bahwa Anda sudah pernah mendaftar sebelumnya.\n\n` + 
                            `Silakan langsung gunakan perintah \
/login\
 di channel ini untuk memulihkan peran dan akses Anda.`
                        )
                        .setThumbnail(member.user.displayAvatarURL())
                        .setTimestamp();
                    
                    await loginChannel.send({ content: `${member}`, embeds: [welcomeBackEmbed] });
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
