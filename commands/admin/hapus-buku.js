/*
================================================================================
File: 📁 smanung-library-bot/commands/admin/hapus-buku.js
Tujuan: Perintah untuk admin menghapus data buku dari database.
================================================================================
*/
const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    MessageFlags 
} = require('discord.js');
const { log } = require('../../utils/logger');
const { handleInteractionError } = require('../../utils/errorHandler'); // ✅ tambah helper

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hapus_buku')
        .setDescription('Menghapus buku dari inventaris perpustakaan.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addStringOption(option =>
            option.setName('buku')
                .setDescription('Pilih buku yang akan dihapus (opsional).')
                .setRequired(false)
                .setAutocomplete(true))
        .addBooleanOption(option =>
            option.setName('hapus_all_buku')
                .setDescription('Hapus SEMUA buku dari database (perlu konfirmasi).')
                .setRequired(false)),

    async autocomplete(interaction, client) {
        const focusedValue = interaction.options.getFocused();
        try {
            const query = 'SELECT id_buku, nama_buku, tingkat_kelas FROM buku WHERE nama_buku LIKE ? LIMIT 25';
            const [rows] = await client.db.query(query, [`%${focusedValue}%`]);
            await interaction.respond(
                rows.map(row => ({ 
                    name: `${row.nama_buku} (Kelas: ${row.tingkat_kelas || 'Umum'})`,
                    value: row.id_buku.toString()
                })),
            );
        } catch (error) {
            log('ERROR', 'AUTOCOMPLETE_HAPUS_BUKU', error.message);
            await interaction.respond([]);
        }
    },

    async execute(interaction, client) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            if (!interaction.member.roles.cache.has(client.config.roles.adminPerpus)) {
                return interaction.editReply({ content: '❌ Anda tidak memiliki izin untuk menggunakan perintah ini.' });
            }

            const bookId = interaction.options.getString('buku');
            const deleteAll = interaction.options.getBoolean('hapus_all_buku');
            const db = client.db;

            if (!bookId && !deleteAll) {
                return interaction.editReply({ content: '❌ Anda harus memilih `buku` atau menyetel `hapus_all_buku` ke True.' });
            }
            if (bookId && deleteAll) {
                return interaction.editReply({ content: '❌ Anda tidak bisa menggunakan `buku` dan `hapus_all_buku` bersamaan.' });
            }

            // --- Logic for Deleting a Single Book ---
            if (bookId) {
                try {
                    const [bookData] = await db.query('SELECT nama_buku FROM buku WHERE id_buku = ?', [bookId]);
                    if (bookData.length === 0) {
                        return interaction.editReply({ content: '❌ Buku tidak ditemukan.' });
                    }
                    const namaBukuDihapus = bookData[0].nama_buku;

                    await db.query('DELETE FROM buku WHERE id_buku = ?', [bookId]);

                    log('INFO', 'BUKU_DELETE', `Buku "${namaBukuDihapus}" (ID: ${bookId}) dihapus oleh ${interaction.user.tag}.`);
                    await interaction.editReply({ content: `✅ Buku **${namaBukuDihapus}** berhasil dihapus.` });

                } catch (error) {
                    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
                        return interaction.editReply({ content: '❌ Gagal menghapus! Buku ini masih memiliki riwayat peminjaman.' });
                    }
                    log('ERROR', 'BUKU_DELETE', error.message);
                    await handleInteractionError(interaction); // ✅ konsisten
                }
                return;
            }

            // --- Logic for Deleting All Books ---
            if (deleteAll) {
                const [peminjaman] = await db.query('SELECT COUNT(*) as count FROM peminjaman');
                if (peminjaman[0].count > 0) {
                    return interaction.editReply({ content: '❌ Semua buku tidak dapat dihapus karena masih ada riwayat peminjaman di database. Kosongkan tabel peminjaman terlebih dahulu.' });
                }

                const confirmId = `confirm_delete_all_buku_${Date.now()}`;
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(confirmId)
                        .setLabel('Ya, Hapus Semua Buku')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('🗑️')
                );
                const embed = new EmbedBuilder()
                    .setColor('Red')
                    .setTitle('Konfirmasi Penghapusan Massal Buku')
                    .setDescription('**PERINGATAN KERAS!** Anda akan menghapus **SEMUA** data buku dari database. Tindakan ini tidak dapat diurungkan. Apakah Anda benar-benar yakin?');

                await interaction.editReply({ embeds: [embed], components: [row] });

                const filter = i => i.customId === confirmId && i.user.id === interaction.user.id;
                try {
                    const confirmation = await interaction.channel.awaitMessageComponent({ filter, time: 60_000 });
                    
                    await confirmation.deferUpdate();

                    await db.query('DELETE FROM buku');
                    log('WARN', 'BUKU_DELETE_ALL', `SEMUA buku dihapus oleh ${interaction.user.tag}.`);
                    
                    const successEmbed = new EmbedBuilder()
                        .setColor('Green')
                        .setTitle('✅ Berhasil')
                        .setDescription('Semua data buku telah berhasil dihapus.');
                    await interaction.editReply({ embeds: [successEmbed], components: [] });

                } catch (err) {
                    if (err.code === 'InteractionCollectorError') {
                        const timeoutEmbed = new EmbedBuilder()
                            .setColor('Grey')
                            .setTitle('Waktu Habis')
                            .setDescription('Konfirmasi tidak diberikan dalam 1 menit. Penghapusan massal dibatalkan.');
                        await interaction.editReply({ embeds: [timeoutEmbed], components: [] });
                    } else {
                        log('ERROR', 'BUKU_DELETE_ALL', err.message);
                        await handleInteractionError(interaction); // ✅ ganti throw err jadi helper
                    }
                }
            }
        } catch (error) {
            log('ERROR', 'RULES_COMMAND', error.message); // ⚠️ tag ini bisa diganti jadi HAPUS_BUKU_COMMAND biar konsisten
            await handleInteractionError(interaction);
        }
    },
};