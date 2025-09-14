/*
================================================================================
File: 📁 smanung-library-bot/commands/admin/manage-kelas.js
Tujuan: Perintah untuk admin mengelola data kelas (CRUD).
================================================================================
*/
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { handleInteractionError } = require('../../utils/errorHandler'); // ✅ Tambah helper
const { log } = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kelas')
        .setDescription('Mengelola data kelas di database.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        // Subcommand: add
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Menambahkan kelas baru.')
                .addStringOption(option =>
                    option.setName('nama_kelas')
                        .setDescription('Nama kelas baru (contoh: X.E7 atau XII.F1).')
                        .setRequired(true)))
        // Subcommand: view
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('Melihat daftar semua kelas.')
                .addStringOption(option =>
                    option.setName('filter')
                        .setDescription('Cari kelas berdasarkan nama (opsional).')
                        .setRequired(false))) 
        // Subcommand: edit
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setDescription('Mengubah nama kelas yang sudah ada.')
                .addIntegerOption(option =>
                    option.setName('id_kelas')
                        .setDescription('ID kelas yang akan diubah (ketik untuk mencari).')
                        .setRequired(true)
                        .setAutocomplete(true))
                .addStringOption(option =>
                    option.setName('nama_baru')
                        .setDescription('Nama baru untuk kelas ini.')
                        .setRequired(true))) 
        // Subcommand: delete (REVISED)
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Menghapus kelas dari database.')
                .addIntegerOption(option =>
                    option.setName('id_kelas')
                        .setDescription('ID kelas yang akan dihapus (opsional).')
                        .setRequired(false)
                        .setAutocomplete(true))
                .addBooleanOption(option =>
                    option.setName('delete_all')
                        .setDescription('Hapus SEMUA kelas (perlu konfirmasi & tidak boleh tertaut).')
                        .setRequired(false))),

    async autocomplete(interaction, client) {
        const focusedOption = interaction.options.getFocused(true);
        if (focusedOption.name !== 'id_kelas') return;

        const focusedValue = focusedOption.value;
        const db = client.db;

        try {
            const query = 'SELECT id_kelas, nama_kelas FROM kelas WHERE nama_kelas LIKE ? OR id_kelas LIKE ? ORDER BY nama_kelas ASC LIMIT 25';
            const [rows] = await db.query(query, [`%${focusedValue}%`, `%${focusedValue}%`]);
            await interaction.respond(
                rows.map(row => ({
                    name: `(ID: ${row.id_kelas}) ${row.nama_kelas}`,
                    value: row.id_kelas
                }))
            );
        } catch (error) {
            log('ERROR', 'KELAS_AUTOCOMPLETE', error.message);
            await interaction.respond([]);
        }
    },

    async execute(interaction, client) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral }); // ✅ Standar error handling

        const hasPermission = interaction.member.roles.cache.has(client.config.roles.adminPerpus) ||
                              interaction.member.roles.cache.has(client.config.roles.developer);

        if (!hasPermission) {
            return interaction.editReply({ content: '❌ Anda tidak memiliki izin untuk menggunakan perintah ini.', flags: MessageFlags.Ephemeral });
        }

        const subcommand = interaction.options.getSubcommand();
        const db = client.db;

        try {
            switch (subcommand) {
                case 'add':
                    await this.handleAdd(interaction, db);
                    break;
                case 'view':
                    await this.handleView(interaction, db);
                    break;
                case 'edit':
                    await this.handleEdit(interaction, db);
                    break;
                case 'delete':
                    await this.handleDelete(interaction, db);
                    break;
            }
        } catch (error) {
            log('ERROR', 'KELAS_COMMAND', error.message);
            await handleInteractionError(interaction);
        }
    },

    async handleAdd(interaction, db) {
        try {
            const namaKelas = interaction.options.getString('nama_kelas');
            const [existing] = await db.query('SELECT id_kelas FROM kelas WHERE nama_kelas = ?', [namaKelas]);
            if (existing.length > 0) {
                return interaction.editReply({ content: `❌ Kelas dengan nama **"${namaKelas}"** sudah ada.` });
            }
            await db.query('INSERT INTO kelas (nama_kelas) VALUES (?)', [namaKelas]);
            log('INFO', 'KELAS_ADD', `Kelas "${namaKelas}" ditambahkan oleh ${interaction.user.tag}.`);
            await interaction.editReply({ content: `✅ Kelas **"${namaKelas}"** berhasil ditambahkan.` });
        } catch (error) {
            log('ERROR', 'KELAS_ADD', error.message);
            await handleInteractionError(interaction);
        }
    },

    async handleView(interaction, db) {
        try {
            const filter = interaction.options.getString('filter');
            let query = 'SELECT id_kelas, nama_kelas FROM kelas';
            const params = [];
            if (filter) {
                query += ' WHERE nama_kelas LIKE ?';
                params.push(`%${filter}%`);
            }
            query += ' ORDER BY nama_kelas ASC LIMIT 50';
            const [results] = await db.query(query, params);
            if (results.length === 0) {
                return interaction.editReply({ content: 'Tidak ada data kelas yang cocok dengan filter Anda.' });
            }
            const embed = new EmbedBuilder().setTitle('🏫 Daftar Kelas').setColor(0x5865F2).setTimestamp();
            const description = results.map(function(r) {
                return '• `ID: ' + r.id_kelas + '` - **' + r.nama_kelas + '**';
            }).join('\n');
            embed.setDescription(description);
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            log('ERROR', 'KELAS_VIEW', error.message);
            await handleInteractionError(interaction);
        }
    },

    async handleEdit(interaction, db) {
        try {
            const idKelas = interaction.options.getInteger('id_kelas');
            const namaBaru = interaction.options.getString('nama_baru');
            const [existing] = await db.query('SELECT id_kelas FROM kelas WHERE nama_kelas = ? AND id_kelas != ?', [namaBaru, idKelas]);
            if (existing.length > 0) {
                return interaction.editReply({ content: `❌ Nama kelas **"${namaBaru}"** sudah digunakan oleh kelas lain.` });
            }
            const [result] = await db.query('UPDATE kelas SET nama_kelas = ? WHERE id_kelas = ?', [namaBaru, idKelas]);
            if (result.affectedRows === 0) {
                return interaction.editReply({ content: `❌ Kelas dengan ID **${idKelas}** tidak ditemukan.` });
            }
            log('INFO', 'KELAS_EDIT', `Kelas ID ${idKelas} diubah menjadi "${namaBaru}" oleh ${interaction.user.tag}.`);
            await interaction.editReply({ content: `✅ Kelas dengan ID **${idKelas}** berhasil diubah menjadi **"${namaBaru}"**.` });
        } catch (error) {
            log('ERROR', 'KELAS_EDIT', error.message);
            await handleInteractionError(interaction);
        }
    },

    async handleDelete(interaction, db) {
        try {
            const idKelas = interaction.options.getInteger('id_kelas');
            const deleteAll = interaction.options.getBoolean('delete_all');

            if (!idKelas && !deleteAll) {
                return interaction.editReply({ content: '❌ Anda harus memilih `id_kelas` atau menyetel `delete_all` ke True.' });
            }
            if (idKelas && deleteAll) {
                return interaction.editReply({ content: '❌ Anda tidak bisa menggunakan `id_kelas` dan `delete_all` bersamaan.' });
            }

            // --- Logic for Deleting a Single Class ---
            if (idKelas) {
                const [peminjaman] = await db.query('SELECT COUNT(*) as count FROM peminjaman WHERE id_kelas = ?', [idKelas]);
                if (peminjaman[0].count > 0) {
                    return interaction.editReply({ content: `❌ Kelas tidak dapat dihapus karena masih tercatat dalam **${peminjaman[0].count}** riwayat peminjaman.` });
                }
                const [jadwal] = await db.query('SELECT COUNT(*) as count FROM jadwal WHERE id_kelas = ?', [idKelas]);
                if (jadwal[0].count > 0) {
                    return interaction.editReply({ content: `❌ Kelas tidak dapat dihapus karena masih digunakan dalam **${jadwal[0].count}** entri jadwal.` });
                }
                const [result] = await db.query('DELETE FROM kelas WHERE id_kelas = ?', [idKelas]);
                if (result.affectedRows === 0) {
                    return interaction.editReply({ content: `❌ Kelas dengan ID **${idKelas}** tidak ditemukan.` });
                }
                log('INFO', 'KELAS_DELETE', `Kelas ID ${idKelas} dihapus oleh ${interaction.user.tag}.`);
                return interaction.editReply({ content: `✅ Kelas dengan ID **${idKelas}** berhasil dihapus.` });
            }

            // --- Logic for Deleting All Classes ---
            if (deleteAll) {
                const [peminjaman] = await db.query('SELECT COUNT(*) as count FROM peminjaman');
                if (peminjaman[0].count > 0) {
                    return interaction.editReply({ content: '❌ Semua kelas tidak dapat dihapus karena masih ada riwayat peminjaman di database.' });
                }
                const [jadwal] = await db.query('SELECT COUNT(*) as count FROM jadwal');
                if (jadwal[0].count > 0) {
                    return interaction.editReply({ content: '❌ Semua kelas tidak dapat dihapus karena masih ada jadwal pelajaran yang tertaut.' });
                }

                const confirmId = `confirm_delete_all_kelas_${Date.now()}`;
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(confirmId).setLabel('Ya, Hapus Semua Kelas').setStyle(ButtonStyle.Danger).setEmoji('🗑️')
                );
                const embed = new EmbedBuilder()
                    .setColor('Red')
                    .setTitle('Konfirmasi Penghapusan Massal Kelas')
                    .setDescription('**PERINGATAN KERAS!** Anda akan menghapus **SEMUA** data kelas. Tindakan ini tidak dapat diurungkan dan akan berdampak besar pada sistem.\n\nApakah Anda benar-benar yakin?');

                await interaction.editReply({ embeds: [embed], components: [row] });

                const filter = i => i.customId === confirmId && i.user.id === interaction.user.id;
                try {
                    const confirmation = await interaction.channel.awaitMessageComponent({ filter, time: 60_000 });
                    
                    await confirmation.deferUpdate();

                    await db.query('DELETE FROM kelas'); // Changed from TRUNCATE to DELETE
                    log('WARN', 'KELAS_DELETE_ALL', `SEMUA kelas dihapus oleh ${interaction.user.tag}.`);
                    
                    const successEmbed = new EmbedBuilder()
                        .setColor('Green')
                        .setTitle('✅ Berhasil')
                        .setDescription('Semua data kelas telah berhasil dihapus.');
                    await interaction.editReply({ embeds: [successEmbed], components: [] });

                } catch (err) {
                    if (err.code === 'InteractionCollectorError') {
                        const timeoutEmbed = new EmbedBuilder()
                            .setColor('Grey')
                            .setTitle('Waktu Habis')
                            .setDescription('Konfirmasi tidak diberikan dalam 1 menit. Penghapusan massal dibatalkan.');
                        await interaction.editReply({ embeds: [timeoutEmbed], components: [] });
                    } else {
                        log('ERROR', 'KELAS_DELETE_ALL', err.message);
                        await handleInteractionError(interaction);
                    }
                }
            }
        } catch (error) {
            log('ERROR', 'KELAS_DELETE', error.message);
            await handleInteractionError(interaction);
        }
    },
};