const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../utils/db');
const { log } = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('jadwal')
        .setDescription('Mengelola jadwal pelajaran (CRUD).')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        // Subcommand: VIEW
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('Melihat jadwal pelajaran dengan filter.')
                .addStringOption(option => option.setName('hari').setDescription('Filter berdasarkan hari.').setRequired(false).addChoices(
                    { name: 'Senin', value: 'Senin' },
                    { name: 'Selasa', value: 'Selasa' },
                    { name: 'Rabu', value: 'Rabu' },
                    { name: 'Kamis', value: 'Kamis' },
                    { name: 'Jumat', value: 'Jumat' },
                ))
                .addStringOption(option => option.setName('kelas').setDescription('Filter berdasarkan nama kelas.').setRequired(false).setAutocomplete(true))
                .addStringOption(option => option.setName('guru').setDescription('Filter berdasarkan nama guru.').setRequired(false).setAutocomplete(true))
                .addStringOption(option => option.setName('mapel').setDescription('Filter berdasarkan mata pelajaran.').setRequired(false).setAutocomplete(true))
        )
        // Subcommand: ADD
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Menambahkan entri jadwal baru.')
                .addStringOption(option => option.setName('hari').setDescription('Hari untuk jadwal baru.').setRequired(true).addChoices(
                    { name: 'Senin', value: 'Senin' },
                    { name: 'Selasa', value: 'Selasa' },
                    { name: 'Rabu', value: 'Rabu' },
                    { name: 'Kamis', value: 'Kamis' },
                    { name: 'Jumat', value: 'Jumat' },
                ))
                .addStringOption(option => option.setName('kelas').setDescription('Nama kelas (contoh: X.E1).').setRequired(true).setAutocomplete(true))
                .addStringOption(option => option.setName('jam_mulai').setDescription('Jam mulai (format HH:MM).').setRequired(true))
                .addStringOption(option => option.setName('jam_selesai').setDescription('Jam selesai (format HH:MM).').setRequired(true))
                .addStringOption(option => option.setName('mapel').setDescription('Nama mata pelajaran.').setRequired(true))
                .addStringOption(option => option.setName('guru').setDescription('Nama guru pengajar.').setRequired(true))
        )
        // Subcommand: UPDATE
        .addSubcommand(subcommand =>
            subcommand
                .setName('update')
                .setDescription('Memperbarui entri jadwal yang ada.')
                .addStringOption(option => option.setName('id_jadwal').setDescription('ID jadwal yang akan diperbarui.').setRequired(true).setAutocomplete(true))
                .addStringOption(option => option.setName('hari_baru').setDescription('Hari baru.').setRequired(false).addChoices(
                    { name: 'Senin', value: 'Senin' },
                    { name: 'Selasa', value: 'Selasa' },
                    { name: 'Rabu', value: 'Rabu' },
                    { name: 'Kamis', value: 'Kamis' },
                    { name: 'Jumat', value: 'Jumat' },
                ))
                .addStringOption(option => option.setName('kelas_baru').setDescription('Kelas baru.').setRequired(false).setAutocomplete(true))
                .addStringOption(option => option.setName('jam_mulai_baru').setDescription('Jam mulai baru (HH:MM).').setRequired(false))
                .addStringOption(option => option.setName('jam_selesai_baru').setDescription('Jam selesai baru (HH:MM).').setRequired(false))
                .addStringOption(option => option.setName('mapel_baru').setDescription('Mata pelajaran baru.').setRequired(false))
                .addStringOption(option => option.setName('guru_baru').setDescription('Nama guru baru.').setRequired(false))
        )
        // Subcommand: DELETE (REVISED)
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Menghapus satu atau semua entri jadwal.')
                .addStringOption(option => option.setName('id_jadwal').setDescription('ID jadwal spesifik yang ingin dihapus.').setRequired(false).setAutocomplete(true))
                .addBooleanOption(option => option.setName('delete_all').setDescription('Pilih True untuk menghapus SEMUA jadwal (memerlukan konfirmasi).').setRequired(false))
        ),

    async autocomplete(interaction, client) {
        const focusedOption = interaction.options.getFocused(true);
        const db = client.db;
        let choices = [];

        try {
            if (focusedOption.name === 'kelas' || focusedOption.name === 'kelas_baru') {
                const [rows] = await db.query('SELECT nama_kelas FROM kelas WHERE nama_kelas LIKE ? LIMIT 25', [`%${focusedOption.value}%`]);
                choices = rows.map(row => ({ name: row.nama_kelas, value: row.nama_kelas }));
            } else if (focusedOption.name === 'guru') {
                const [rows] = await db.query('SELECT DISTINCT nama_guru FROM jadwal WHERE nama_guru LIKE ? LIMIT 25', [`%${focusedOption.value}%`]);
                choices = rows.map(row => ({ name: row.nama_guru, value: row.nama_guru }));
            } else if (focusedOption.name === 'mapel') {
                const [rows] = await db.query('SELECT DISTINCT mata_pelajaran FROM jadwal WHERE mata_pelajaran LIKE ? LIMIT 25', [`%${focusedOption.value}%`]);
                choices = rows.map(row => ({ name: row.mata_pelajaran, value: row.mata_pelajaran }));
            } else if (focusedOption.name === 'id_jadwal') {
                const query = `
                    SELECT j.id_jadwal, j.hari, j.jam_mulai, j.mata_pelajaran, k.nama_kelas 
                    FROM jadwal j JOIN kelas k ON j.id_kelas = k.id_kelas 
                    WHERE j.id_jadwal LIKE ? OR j.mata_pelajaran LIKE ? OR k.nama_kelas LIKE ?
                    ORDER BY j.id_jadwal DESC LIMIT 25`;
                const [rows] = await db.query(query, [`%${focusedOption.value}%`, `%${focusedOption.value}%`, `%${focusedOption.value}%`]);
                choices = rows.map(row => ({
                    name: `ID: ${row.id_jadwal} | ${row.nama_kelas} - ${row.mata_pelajaran} (${row.hari}, ${row.jam_mulai.substring(0, 5)})`,
                    value: row.id_jadwal.toString()
                }));
            }
        } catch (error) {
            log('ERROR', 'JADWAL_AUTOCOMPLETE', `Error: ${error.message}`);
        }

        await interaction.respond(choices);
    },

    async execute(interaction, client) {
        if (!interaction.member.roles.cache.has(client.config.roles.adminPerpus)) {
            return interaction.reply({ content: '❌ Anda tidak memiliki peran yang tepat untuk menggunakan perintah ini.', ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();
        const db = client.db;

        try {
            switch (subcommand) {
                case 'view':
                    await this.handleView(interaction, db);
                    break;
                case 'add':
                    await this.handleAdd(interaction, db);
                    break;
                case 'update':
                    await this.handleUpdate(interaction, db);
                    break;
                case 'delete':
                    await this.handleDelete(interaction, db, client);
                    break;
            }
        } catch (error) {
            log('ERROR', `JADWAL_${subcommand.toUpperCase()}` ,`Error executing /jadwal ${subcommand}: ${error.message}`);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: '❌ Terjadi kesalahan internal saat memproses perintah Anda.', ephemeral: true });
            } else {
                await interaction.editReply({ content: '❌ Terjadi kesalahan internal saat memproses perintah Anda.' });
            }
        }
    },

    async handleView(interaction, db) {
        await interaction.deferReply({ ephemeral: true });
        const filters = {
            hari: interaction.options.getString('hari'),
            kelas: interaction.options.getString('kelas'),
            guru: interaction.options.getString('guru'),
            mapel: interaction.options.getString('mapel'),
        };

        let query = 'SELECT j.id_jadwal, j.hari, j.jam_mulai, j.jam_selesai, j.mata_pelajaran, j.nama_guru, k.nama_kelas FROM jadwal j JOIN kelas k ON j.id_kelas = k.id_kelas';
        const whereClauses = [];
        const queryParams = [];

        if (filters.hari) { whereClauses.push('j.hari = ?'); queryParams.push(filters.hari); }
        if (filters.kelas) { whereClauses.push('k.nama_kelas = ?'); queryParams.push(filters.kelas); }
        if (filters.guru) { whereClauses.push('j.nama_guru = ?'); queryParams.push(filters.guru); }
        if (filters.mapel) { whereClauses.push('j.mata_pelajaran = ?'); queryParams.push(filters.mapel); }

        if (whereClauses.length > 0) {
            query += ' WHERE ' + whereClauses.join(' AND ');
        }
        query += ' ORDER BY j.hari, j.jam_mulai LIMIT 25';

        const [results] = await db.query(query, queryParams);

        if (results.length === 0) {
            return interaction.editReply({ content: 'Tidak ada data jadwal yang cocok dengan filter Anda.' });
        }

        const embed = new EmbedBuilder()
            .setTitle('🗓️ Hasil Pencarian Jadwal')
            .setColor(0x3498db)
            .setTimestamp();

        let description = '';
        results.forEach(r => {
            description += `**ID: ${r.id_jadwal}** | ${r.hari}, ${r.jam_mulai.substring(0, 5)}-${r.jam_selesai.substring(0, 5)} | **${r.nama_kelas}** | ${r.mata_pelajaran} (${r.nama_guru})\n`;
        });

        embed.setDescription(description);
        await interaction.editReply({ embeds: [embed] });
    },

    async handleAdd(interaction, db) {
        await interaction.deferReply({ ephemeral: true });
        const kelasNama = interaction.options.getString('kelas');
        const [kelasRows] = await db.query('SELECT id_kelas FROM kelas WHERE nama_kelas = ?', [kelasNama]);
        if (kelasRows.length === 0) {
            return interaction.editReply({ content: `❌ Kelas dengan nama "${kelasNama}" tidak ditemukan.` });
        }
        const id_kelas = kelasRows[0].id_kelas;

        const newEntry = {
            id_kelas,
            hari: interaction.options.getString('hari'),
            jam_mulai: interaction.options.getString('jam_mulai'),
            jam_selesai: interaction.options.getString('jam_selesai'),
            mata_pelajaran: interaction.options.getString('mapel'),
            nama_guru: interaction.options.getString('guru'),
        };

        await db.query('INSERT INTO jadwal SET ?', newEntry);
        await interaction.editReply({ content: '✅ Entri jadwal baru berhasil ditambahkan.' });
    },

    async handleUpdate(interaction, db) {
        await interaction.deferReply({ ephemeral: true });
        const id_jadwal = interaction.options.getString('id_jadwal');
        const updates = {};
        
        if (interaction.options.getString('hari_baru')) updates.hari = interaction.options.getString('hari_baru');
        if (interaction.options.getString('jam_mulai_baru')) updates.jam_mulai = interaction.options.getString('jam_mulai_baru');
        if (interaction.options.getString('jam_selesai_baru')) updates.jam_selesai = interaction.options.getString('jam_selesai_baru');
        if (interaction.options.getString('mapel_baru')) updates.mata_pelajaran = interaction.options.getString('mapel_baru');
        if (interaction.options.getString('guru_baru')) updates.nama_guru = interaction.options.getString('guru_baru');

        const kelasNamaBaru = interaction.options.getString('kelas_baru');
        if (kelasNamaBaru) {
            const [kelasRows] = await db.query('SELECT id_kelas FROM kelas WHERE nama_kelas = ?', [kelasNamaBaru]);
            if (kelasRows.length === 0) {
                return interaction.editReply({ content: `❌ Kelas baru "${kelasNamaBaru}" tidak ditemukan.` });
            }
            updates.id_kelas = kelasRows[0].id_kelas;
        }

        if (Object.keys(updates).length === 0) {
            return interaction.editReply({ content: 'Anda harus menyediakan setidaknya satu field untuk diperbarui.' });
        }

        const [result] = await db.query('UPDATE jadwal SET ? WHERE id_jadwal = ?', [updates, id_jadwal]);
        if (result.affectedRows === 0) {
            return interaction.editReply({ content: `❌ Jadwal dengan ID ${id_jadwal} tidak ditemukan.` });
        }

        await interaction.editReply({ content: `✅ Jadwal dengan ID ${id_jadwal} berhasil diperbarui.` });
    },

    async handleDelete(interaction, db, client) {
        const idJadwal = interaction.options.getString('id_jadwal');
        const deleteAll = interaction.options.getBoolean('delete_all');

        if (!idJadwal && !deleteAll) {
            return interaction.reply({ content: '❌ Anda harus memilih `id_jadwal` untuk menghapus satu jadwal, atau `delete_all: True` untuk menghapus semua.', ephemeral: true });
        }

        if (idJadwal && deleteAll) {
            return interaction.reply({ content: '❌ Anda tidak dapat menggunakan `id_jadwal` dan `delete_all` secara bersamaan.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        if (idJadwal) {
            const [result] = await db.query('DELETE FROM jadwal WHERE id_jadwal = ?', [idJadwal]);
            if (result.affectedRows > 0) {
                log('INFO', 'JADWAL_DELETE', `Admin ${interaction.user.tag} menghapus jadwal dengan ID: ${idJadwal}.`);
                await interaction.editReply({ content: `✅ Jadwal dengan ID **${idJadwal}** berhasil dihapus.` });
            } else {
                await interaction.editReply({ content: `⚠️ Jadwal dengan ID **${idJadwal}** tidak ditemukan.` });
            }
        } else if (deleteAll) {
            const confirmId = `confirm_delete_all_jadwal_${Date.now()}`;
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(confirmId)
                        .setLabel('Ya, Hapus Semua Jadwal')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('🗑️'),
                );

            const embed = new EmbedBuilder()
                .setColor('Red')
                .setTitle('Konfirmasi Penghapusan Massal')
                .setDescription('**PERINGATAN!** Anda akan menghapus **SEMUA** data jadwal pelajaran. Tindakan ini tidak dapat diurungkan.\n\nApakah Anda benar-benar yakin ingin melanjutkan?');

            await interaction.editReply({ embeds: [embed], components: [row], ephemeral: true });

            const filter = i => i.customId === confirmId && i.user.id === interaction.user.id;
            try {
                const confirmation = await interaction.channel.awaitMessageComponent({ filter, time: 60_000 });

                await confirmation.deferUpdate();

                await db.query('TRUNCATE TABLE jadwal');
                log('WARN', 'JADWAL_DELETE_ALL', `Admin ${interaction.user.tag} menghapus SEMUA jadwal pelajaran.`);
                
                const successEmbed = new EmbedBuilder()
                    .setColor('Green')
                    .setTitle('✅ Berhasil')
                    .setDescription('Semua data jadwal pelajaran telah berhasil dihapus.');

                await confirmation.editReply({ embeds: [successEmbed], components: [] });

            } catch (err) {
                if (err.code === 'InteractionCollectorError') {
                    const timeoutEmbed = new EmbedBuilder()
                        .setColor('Grey')
                        .setTitle('Waktu Habis')
                        .setDescription('Konfirmasi tidak diberikan dalam 1 menit. Penghapusan massal dibatalkan.');
                    await interaction.editReply({ embeds: [timeoutEmbed], components: [] });
                } else {
                    log('ERROR', 'JADWAL_DELETE_ALL', `Error saat konfirmasi hapus semua jadwal: ${err.message}`);
                    throw err;
                }
            }
        }
    },
};