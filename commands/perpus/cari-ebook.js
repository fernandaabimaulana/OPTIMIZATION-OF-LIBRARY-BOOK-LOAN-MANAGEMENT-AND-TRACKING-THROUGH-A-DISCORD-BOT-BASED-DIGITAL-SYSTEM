/*
================================================================================
File: 📁 smanung-library-bot/commands/perpus/cari-ebook.js
Tujuan: Fitur pencarian e-book untuk pengguna dengan rekomendasi dan timer pesan.
Versi: 3.0
================================================================================
*/
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, MessageFlags } = require('discord.js');
const startMessageTimer = require('../../utils/messageTimer'); // Import the new utility
const { handleInteractionError } = require('../../utils/errorHandler'); // ✅ Tambah helper
const { log } = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('baca-ebook')
        .setDescription('Mencari e-book digital di perpustakaan berdasarkan judul atau penulis.')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Judul e-book, penulis, atau kata kunci untuk dicari.')
                .setAutocomplete(true)
                .setRequired(true)),

    async autocomplete(interaction, client) {
        const focusedValue = interaction.options.getFocused();
        const db = client.db;

        if (!focusedValue) {
            return await interaction.respond([]);
        }

        try {
            const query = `
                SELECT judul, penulis 
                FROM ebooks 
                WHERE judul LIKE ? OR penulis LIKE ? 
                ORDER BY judul ASC 
                LIMIT 25
            `;
            const [results] = await db.query(query, [`${focusedValue}%`, `${focusedValue}%`]);

            const choices = results.map(ebook => {
                const displayName = `${ebook.judul} (Penulis: ${ebook.penulis || 'N/A'})`;
                return { name: displayName.substring(0, 100), value: ebook.judul };
            });

            await interaction.respond(choices);
        } catch (error) {
            log('ERROR', 'BACA_EBOOK_AUTOCOMPLETE', error.message);
            await interaction.respond([]);
        }
    },

    async execute(interaction, client) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const query = interaction.options.getString('query');
        const db = client.db;
        const MESSAGE_LIFETIME_MS = 5 * 60 * 1000; // 5 menit

        try {
            const sqlQuery = `
                SELECT id, judul, penulis, deskripsi, nama_file
                FROM ebooks
                WHERE judul LIKE ? OR penulis LIKE ?
                ORDER BY judul ASC
                LIMIT 10;
            `;

            const [results] = await db.query(sqlQuery, [`${query}%`, `${query}%`]);

            if (results.length === 0) {
                const noResultEmbed = new EmbedBuilder()
                    .setColor('Red')
                    .setTitle('❌ Hasil Pencarian E-book')
                    .setDescription(`Tidak ada e-book yang cocok dengan kata kunci **"${query}"**. Silakan coba lagi.`)
                    .setTimestamp();

                const noResultReply = await interaction.editReply({
                    embeds: [noResultEmbed]
                });
                await startMessageTimer(noResultReply, client, MESSAGE_LIFETIME_MS);
                return;
            }

            const selectMenuOptions = results.map(ebook => ({
                label: `${ebook.judul}`.substring(0, 100),
                description: `Penulis: ${ebook.penulis || 'Anonim'}`.substring(0, 100),
                value: ebook.id.toString(),
            }));

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('select-ebook-to-read')
                .setPlaceholder('Pilih e-book untuk dilihat detailnya...')
                .addOptions(selectMenuOptions);

            const row = new ActionRowBuilder()
                .addComponents(selectMenu);

            const resultEmbed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle(`📚 Hasil Pencarian E-book untuk "${query}"`)
                .setDescription(`Ditemukan ${results.length} e-book yang cocok. Silakan pilih salah satu dari daftar di bawah untuk melihat detail dan membacanya.`)
                .setTimestamp();
            
            const replyMessage = await interaction.editReply({
                embeds: [resultEmbed],
                components: [row]
            });

            await startMessageTimer(replyMessage, client, MESSAGE_LIFETIME_MS);

        } catch (error) {
            log('ERROR', 'BACA_EBOOK', error.message);
            const errorEmbed = new EmbedBuilder()
                .setColor('Red')
                .setTitle('❌ Terjadi Kesalahan')
                .setDescription('Terjadi kesalahan saat mencari e-book di database.')
                .setTimestamp();

            const errorReply = await interaction.editReply({
                embeds: [errorEmbed]
            });
            await handleInteractionError(interaction);
            await startMessageTimer(errorReply, client, MESSAGE_LIFETIME_MS);
        }
    },
};