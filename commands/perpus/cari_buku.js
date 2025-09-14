/*
================================================================================
File: 📁 smanung-library-bot/commands/perpus/cari_buku.js
Tujuan: Fitur pencarian buku untuk pengguna dengan UI/UX yang lebih baik.
Versi: 3.0
================================================================================
*/
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const path = require('node:path');
const fs = require('node:fs');
const startMessageTimer = require('../../utils/messageTimer'); // Import the new utility
const { handleInteractionError } = require('../../utils/errorHandler'); // ✅ Tambah helper
const { log } = require('../../utils/logger');

// Helper function to create the detailed embed for a single book
function createBookEmbed(book) {
    const embed = new EmbedBuilder()
        .setTitle(`📖 ${book.nama_buku}`)
        .setColor(0x3498db)
        .setTimestamp();
    
    embed.addFields(
        { name: 'Genre', value: book.genre || '-', inline: true },
        { name: 'Tahun Terbit', value: book.tahun_terbit ? book.tahun_terbit.toString() : '-', inline: true },
        { name: 'ISBN', value: book.isbn || '-', inline: true },
        { name: 'Mata Pelajaran', value: book.mata_pelajaran_terkait || 'Umum', inline: false },
        { name: 'Stok', value: `\`${book.stok_tersedia}\` dari \`${book.total_stok}\``, inline: true },
        { name: 'Dipinjam', value: `\`${book.sedang_dipinjam}\``, inline: true },
    );

    const actionRow = new ActionRowBuilder();
    if (book.file_sampul) {
        actionRow.addComponents(
            new ButtonBuilder()
                .setCustomId(`view_cover_${book.id_buku}`)
                .setLabel('Lihat Sampul')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🖼️')
        );
    }
    if (book.lokasi_rak) {
        actionRow.addComponents(
            new ButtonBuilder()
                .setCustomId(`view_shelf_${book.id_buku}`)
                .setLabel('Lihat Lokasi Rak')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('📍')
        );
    }

    const replyOptions = { embeds: [embed], components: [] };
    if (actionRow.components.length > 0) {
        replyOptions.components.push(actionRow);
    }

    return replyOptions;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cari_buku')
        .setDescription('Mencari buku di perpustakaan berdasarkan judul, mapel, genre, atau ISBN.')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Judul buku, mata pelajaran, atau kata kunci untuk dicari.')
                .setRequired(true)),

    async execute(interaction, client) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const query = interaction.options.getString('query');
        const db = client.db;
        const MESSAGE_LIFETIME_MS = 60 * 1000; // 1 menit

        try {
            const sqlQuery = `
                SELECT 
                    b.id_buku, b.nama_buku, b.mata_pelajaran_terkait, b.tingkat_kelas,
                    b.stok_tersedia, b.total_stok, b.file_sampul,
                    b.tahun_terbit, b.isbn, b.genre, b.lokasi_rak,
                    COALESCE(SUM(CASE WHEN p.status = 'DIPINJAM' THEN p.jumlah_pinjam ELSE 0 END), 0) AS sedang_dipinjam
                FROM buku b
                LEFT JOIN peminjaman p ON b.id_buku = p.id_buku
                WHERE b.nama_buku LIKE ? OR b.mata_pelajaran_terkait LIKE ? OR b.genre LIKE ? OR b.isbn LIKE ?
                GROUP BY b.id_buku
                ORDER BY b.nama_buku ASC
                LIMIT 25;
            `;

            const [results] = await db.query(sqlQuery, [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`]);

            if (results.length === 0) {
                const replyMessage = await interaction.editReply({ content: `❌ Tidak ada buku yang cocok dengan kata kunci **"${query}"**. Silakan coba lagi.` });
                await startMessageTimer(replyMessage, client, MESSAGE_LIFETIME_MS);
                return;
            }

            if (results.length === 1) {
                const book = results[0];
                const replyOptions = createBookEmbed(book);
                const replyMessage = await interaction.editReply(replyOptions);
                await startMessageTimer(replyMessage, client, MESSAGE_LIFETIME_MS);
                return;
            }

            const selectMenuOptions = results.map(book => ({
                label: `${book.nama_buku} (Kelas: ${book.tingkat_kelas})`.substring(0, 100),
                description: `Genre: ${book.genre || '-'}`.substring(0, 100),
                value: book.id_buku.toString(),
            }));

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('select_book_to_view')
                .setPlaceholder('Ditemukan beberapa hasil, pilih satu buku untuk dilihat...')
                .addOptions(selectMenuOptions);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            const resultEmbed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle(`🔍 Ditemukan ${results.length} hasil untuk "${query}"`) 
                .setDescription(`Silakan pilih salah satu buku dari daftar di bawah untuk melihat detail lengkapnya.`);
            
            const replyMessage = await interaction.editReply({
                embeds: [resultEmbed],
                components: [row]
            });
            await startMessageTimer(replyMessage, client, MESSAGE_LIFETIME_MS);

        } catch (error) {
            log('ERROR', 'CARI_BUKU', error.message);
            const errorReply = await interaction.editReply({ content: '❌ Terjadi kesalahan saat mencari buku di database.' });
            await handleInteractionError(interaction);
            await startMessageTimer(errorReply, client, MESSAGE_LIFETIME_MS);
        }
    },
    createBookEmbed,
};
