/*
================================================================================
File: 📁 smanung-library-bot/commands/admin/list-anggota.js
Tujuan: Perintah untuk admin melihat daftar anggota terdaftar berdasarkan peran.
================================================================================
*/
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../../utils/db');
const { log } = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('list_anggota')
        .setDescription('Menampilkan daftar anggota perpustakaan yang terdaftar di database.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction, client) {
        // Role and developer check
        const isAdmin = interaction.member.roles.cache.has(client.config.roles.adminPerpus);
        const isDeveloper = client.config.developerIds.includes(interaction.user.id);

        if (!isAdmin && !isDeveloper) {
            return interaction.reply({ content: '❌ Anda tidak memiliki izin untuk menggunakan perintah ini.', flags: MessageFlags.Ephemeral });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            // Fetch all registered users from the database
            const [users] = await db.query('SELECT nama_lengkap, tipe_pengguna, discord_id FROM pengguna WHERE terverifikasi = 1 ORDER BY tipe_pengguna, nama_lengkap');

            if (users.length === 0) {
                return interaction.editReply({ content: 'ℹ️ Belum ada anggota yang terdaftar di database.' });
            }

            // Fetch all guild members to ensure they are still in the server
            const guildMembers = await interaction.guild.members.fetch();

            const members = {
                admin: [],
                guru: [],
                siswa: []
            };

            for (const user of users) {
                const member = guildMembers.get(user.discord_id);
                if (member) { // Only list members who are still in the server
                    const userString = `> <@${user.discord_id}> - ${user.nama_lengkap}`;
                    if (user.tipe_pengguna === 'admin') {
                        members.admin.push(userString);
                    } else if (user.tipe_pengguna === 'guru') {
                        members.guru.push(userString);
                    } else if (user.tipe_pengguna === 'siswa') {
                        members.siswa.push(userString);
                    }
                }
            }

            const embed = new EmbedBuilder()
                .setColor('Blue')
                .setTitle('Daftar Anggota Perpustakaan')
                .setTimestamp();

            // Function to split long lists into multiple fields
            const addFields = (title, list) => {
                if (list.length === 0) {
                    embed.addFields({ name: title, value: '> Tidak ada.' });
                    return;
                }

                let currentField = '';
                let part = 1;
                for (const item of list) {
                    if (currentField.length + item.length + 1 > 1024) {
                        embed.addFields({ name: `${title} (Bagian ${part})`, value: currentField });
                        currentField = '';
                        part++;
                    }
                    currentField += item + '\n';
                }
                embed.addFields({ name: `${title} (Bagian ${part})`, value: currentField });
            };
            
            addFields('👑 Admin', members.admin);
            addFields('🧑‍🏫 Guru', members.guru);
            addFields('🎓 Siswa', members.siswa);


            await interaction.editReply({ embeds: [embed] });
            log('INFO', 'LIST_ANGGOTA', `Daftar anggota telah ditampilkan untuk ${interaction.user.tag}.`);

        } catch (error) {
            log('ERROR', 'LIST_ANGGOTA', `Gagal mengambil daftar anggota. Error: ${error.message}`);
            await interaction.editReply({ content: `❌ Terjadi kesalahan saat mengambil data dari database: ${error.message}` });
        }
    },
};
