/*
================================================================================
File: 📁 smanung-library-bot/commands/admin/edit-buku.js
Tujuan: Perintah untuk admin mengedit data buku yang sudah ada.
================================================================================
*/
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../../utils/db');
const { log } = require('../../utils/logger');
const fs = require('node:fs');
const path = require('node:path');
const axios = require('axios');

// Helper function to save attachments
async function saveAttachment(attachment, subfolder) {
    if (!['image/jpeg', 'image/png'].includes(attachment.contentType)) {
        throw new Error(`Format file harus JPG atau PNG, bukan ${attachment.contentType}.`);
    }

    const fileName = `${Date.now()}-${attachment.name}`;
    const savePath = path.join(__dirname, '..', '..', 'public', subfolder, fileName);
    
    const dirPath = path.dirname(savePath);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }

    const response = await axios({
        method: 'get',
        url: attachment.url,
        responseType: 'stream'
    });
    const writer = fs.createWriteStream(savePath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });

    log('INFO', 'EDIT_BUKU_FILE', `File '${fileName}' berhasil disimpan di '${subfolder}'.`);
    return fileName;
}


module.exports = {
    data: new SlashCommandBuilder()
        .setName('edit_buku')
        .setDescription('Mengedit detail buku yang sudah ada di database.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addStringOption(option =>
            option.setName('buku')
                .setDescription('Pilih buku yang ingin diedit (mulai ketik untuk mencari).')
                .setRequired(true)
                .setAutocomplete(true))
        .addStringOption(option => option.setName('nama_buku_baru').setDescription('Setel judul baru untuk buku ini.'))
        .addStringOption(option => option.setName('mata_pelajaran_baru').setDescription('Setel mata pelajaran baru.').setAutocomplete(true))
        .addIntegerOption(option => option.setName('total_stok_baru').setDescription('Setel jumlah total stok yang baru.'))
        .addIntegerOption(option => option.setName('tahun_terbit').setDescription('Setel tahun terbit buku.'))
        .addStringOption(option => option.setName('isbn').setDescription('Setel nomor ISBN buku.'))
        .addStringOption(option => option.setName('genre').setDescription('Setel genre buku.'))
        .addAttachmentOption(option => option.setName('sampul_baru').setDescription('Unggah file gambar sampul baru (JPG/PNG).'))
        .addAttachmentOption(option => option.setName('foto_rak_baru').setDescription('Unggah file foto lokasi rak yang baru (JPG/PNG).')),

    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);

        if (focusedOption.name === 'buku') {
            const focusedValue = focusedOption.value;
            if (!focusedValue) return await interaction.respond([]);
            try {
                const query = 'SELECT id_buku, nama_buku, mata_pelajaran_terkait FROM buku WHERE nama_buku LIKE ? LIMIT 25';
                const [rows] = await db.query(query, [`%${focusedValue}%`]);
                await interaction.respond(rows.map(row => ({
                    name: `${row.nama_buku} (Mapel: ${row.mata_pelajaran_terkait})`, 
                    value: row.id_buku.toString()
                })));
            } catch (error) {
                log('ERROR', 'AUTOCOMPLETE_EDIT_BUKU', `Error: ${error.message}`);
                await interaction.respond([]);
            }
        } else if (focusedOption.name === 'mata_pelajaran_baru') {
            const focusedValue = focusedOption.value;
            try {
                const query = 'SELECT DISTINCT mata_pelajaran FROM jadwal WHERE mata_pelajaran LIKE ? ORDER BY mata_pelajaran ASC LIMIT 10';
                const [rows] = await db.query(query, [`%${focusedValue}%`]);
                await interaction.respond(rows.map(row => ({ name: row.mata_pelajaran, value: row.mata_pelajaran })));
            } catch (error) {
                log('ERROR', 'AUTOCOMPLETE_EDIT_MAPEL', `Error: ${error.message}`);
                await interaction.respond([]);
            }
        }
    },

    async execute(interaction, client) {
        if (!interaction.member.roles.cache.has(client.config.roles.adminPerpus)) {
            return interaction.reply({ content: '❌ Anda tidak memiliki peran yang tepat untuk menggunakan perintah ini.', flags: MessageFlags.Ephemeral });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const bookId = interaction.options.getString('buku');
        
        // Fetch original book name for logging
        const [[bookBefore]] = await db.query('SELECT nama_buku FROM buku WHERE id_buku = ?', [bookId]);
        if (!bookBefore) {
            return interaction.editReply({ content: '❌ Buku yang dipilih tidak valid atau tidak ditemukan.', flags: MessageFlags.Ephemeral });
        }

        const fieldsToUpdate = [];
        const values = [];
        const updatedInfo = [];

        // Text and Integer options
        const options = {
            nama_buku_baru: { column: 'nama_buku', value: interaction.options.getString('nama_buku_baru') },
            mata_pelajaran_baru: { column: 'mata_pelajaran_terkait', value: interaction.options.getString('mata_pelajaran_baru') },
            total_stok_baru: { column: 'total_stok', value: interaction.options.getInteger('total_stok_baru') },
            tahun_terbit: { column: 'tahun_terbit', value: interaction.options.getInteger('tahun_terbit') },
            isbn: { column: 'isbn', value: interaction.options.getString('isbn') },
            genre: { column: 'genre', value: interaction.options.getString('genre') },
        };

        for (const [key, { column, value }] of Object.entries(options)) {
            if (value !== null) {
                fieldsToUpdate.push(`${column} = ?`);
                values.push(value);
                updatedInfo.push(`**${column}:** ${value}`);
            }
        }

        try {
            // Attachment options
            const sampulAttachment = interaction.options.getAttachment('sampul_baru');
            if (sampulAttachment) {
                const fileName = await saveAttachment(sampulAttachment, 'sampul');
                fieldsToUpdate.push('file_sampul = ?');
                values.push(fileName);
                updatedInfo.push('**file_sampul:** Diperbarui');
            }

            const rakAttachment = interaction.options.getAttachment('foto_rak_baru');
            if (rakAttachment) {
                const fileName = await saveAttachment(rakAttachment, 'rak');
                fieldsToUpdate.push('lokasi_rak = ?');
                values.push(fileName);
                updatedInfo.push('**lokasi_rak:** Diperbarui');
            }

            if (fieldsToUpdate.length === 0) {
                return interaction.editReply({ content: '⚠️ Anda tidak memberikan informasi baru untuk diubah.', flags: MessageFlags.Ephemeral });
            }

            const sqlQuery = `UPDATE buku SET ${fieldsToUpdate.join(', ')} WHERE id_buku = ?`;
            values.push(bookId);

            await client.db.query(sqlQuery, values);

            const embed = new EmbedBuilder()
                .setColor('Orange')
                .setTitle('✅ Buku Berhasil Diperbarui')
                .setDescription(`Detail untuk buku **${bookBefore.nama_buku}** telah berhasil diubah.`)
                .addFields({ name: 'Perubahan yang Dilakukan', value: updatedInfo.join('\n') })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
            log('INFO', 'EDIT_BUKU_DB', `Buku ID ${bookId} (${bookBefore.nama_buku}) telah diedit oleh ${interaction.user.tag}.`);

        } catch (error) {
            log('ERROR', 'EDIT_BUKU_DB', `Gagal mengedit buku ID ${bookId}. Error: ${error.message}`);
            await interaction.editReply({ content: `❌ Terjadi kesalahan: ${error.message}`, flags: MessageFlags.Ephemeral });
        }
    },
};