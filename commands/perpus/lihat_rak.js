/*
================================================================================
File: 📁 smanung-library-bot/commands/perpus/lihat_rak.js
Tujuan: Perintah untuk pengguna melihat foto lokasi rak buku.
================================================================================
*/
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../utils/db');
const { log } = require('../../utils/logger');
const path = require('node:path');
const fs = require('node:fs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lihat_rak')
        .setDescription('Melihat foto lokasi rak untuk sebuah buku.')
        .addStringOption(option =>
            option.setName('buku')
                .setDescription('Pilih buku yang ingin Anda lihat lokasi raknya.')
                .setRequired(true)
                .setAutocomplete(true)),

    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);

        if (focusedOption.name === 'buku') {
            const focusedValue = focusedOption.value;
            if (!focusedValue) return await interaction.respond([]);
            try {
                // Only show books that have a shelf location photo
                const query = 'SELECT id_buku, nama_buku FROM buku WHERE lokasi_rak IS NOT NULL AND nama_buku LIKE ? LIMIT 25';
                const [rows] = await db.query(query, [`%${focusedValue}%`]);
                await interaction.respond(rows.map(row => ({ 
                    name: row.nama_buku, 
                    value: row.id_buku.toString() 
                })));
            } catch (error) {
                log('ERROR', 'AUTOCOMPLETE_LIHAT_RAK', `Error: ${error.message}`);
                await interaction.respond([]);
            }
        }
    },

    async execute(interaction, client) {
        await interaction.deferReply();

        const bookId = interaction.options.getString('buku');

        try {
            const [[book]] = await db.query('SELECT nama_buku, lokasi_rak FROM buku WHERE id_buku = ?', [bookId]);

            if (!book) {
                return interaction.editReply({ content: '❌ Buku tidak ditemukan.', ephemeral: true });
            }

            if (!book.lokasi_rak) {
                return interaction.editReply({ content: `⚠️ Buku "${book.nama_buku}" tidak memiliki foto lokasi rak.`, ephemeral: true });
            }

            const imagePath = path.join(__dirname, '..', '..', 'public', 'rak', book.lokasi_rak);

            if (!fs.existsSync(imagePath)) {
                log('WARN', 'LIHAT_RAK', `File lokasi rak tidak ditemukan di disk untuk buku ID ${bookId}: ${book.lokasi_rak}`);
                return interaction.editReply({ content: `❌ Foto lokasi rak untuk buku "${book.nama_buku}" tidak dapat ditemukan. Harap hubungi admin.`, ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setTitle(`📍 Lokasi Rak untuk: ${book.nama_buku}`)
                .setColor(0x1ABC9C)
                .setImage(`attachment://${book.lokasi_rak}`)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed], files: [imagePath] });

        } catch (error) {
            log('ERROR', 'LIHAT_RAK_EXEC', `Gagal mengambil lokasi rak untuk buku ID ${bookId}. Error: ${error.message}`);
            await interaction.editReply({ content: '❌ Terjadi kesalahan saat mencoba mengambil data lokasi rak.', ephemeral: true });
        }
    },
};