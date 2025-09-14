/*
================================================================================
File: 📁 smanung-library-bot/commands/admin/tambah-buku.js
Tujuan: Perintah untuk admin menambahkan data buku baru ke database.
================================================================================
*/
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../../utils/db');
const { log } = require('../../utils/logger');
const { handleInteractionError } = require('../../utils/errorHandler'); // ✅ Tambah helper
const fs = require('node:fs');
const path = require('node:path');
const axios = require('axios');

// Helper function to save attachments, similar to edit-buku.js
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

    log('INFO', 'TAMBAH_BUKU_FILE', `File '${fileName}' berhasil disimpan di '${subfolder}'.`);
    return fileName;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tambah_buku')
        .setDescription('Menambahkan buku baru ke dalam inventaris perpustakaan.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addStringOption(option =>
            option.setName('kelas')
                .setDescription('Pilih tingkatan kelas untuk buku ini.')
                .setRequired(true)
                .setAutocomplete(true))
        .addStringOption(option =>
            option.setName('nama_buku')
                .setDescription('Judul lengkap buku (tanpa tingkatan kelas).')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('total_stok')
                .setDescription('Jumlah total buku ini yang dimiliki perpustakaan.')
                .setRequired(true))
        .addAttachmentOption(option =>
            option.setName('sampul')
                .setDescription('File gambar sampul buku (JPG/PNG).')
                .setRequired(false))
        .addAttachmentOption(option =>
            option.setName('foto_rak')
                .setDescription('Unggah foto lokasi buku di rak (opsional).')),

    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);

        if (focusedOption.name === 'kelas') {
            const focusedValue = focusedOption.value;
            try {
                const tingkatan = ['X', 'XI', 'XII'];
                const filtered = tingkatan.filter(tingkat => tingkat.startsWith(focusedValue.toUpperCase()));
                await interaction.respond(filtered.map(tingkat => ({ name: `Kelas ${tingkat}`, value: tingkat })));
            } catch (error) {
                log('ERROR', 'AUTOCOMPLETE', `Error pada autocomplete kelas: ${error.message}`);
                await interaction.respond([]);
            }
        }
    },

    async execute(interaction, client) {
        if (!interaction.member.roles.cache.has(client.config.roles.adminPerpus)) {
            log('WARN', 'TAMBAH_BUKU', `User ${interaction.user.tag} mencoba menambah buku tanpa izin.`);
            return interaction.editReply({ content: '❌ Anda tidak memiliki peran yang tepat untuk menggunakan perintah ini.', flags: MessageFlags.Ephemeral });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const tingkatKelas = interaction.options.getString('kelas'); // X, XI, or XII
        const namaBuku = interaction.options.getString('nama_buku');
        const stok = interaction.options.getInteger('total_stok');
        const sampulAttachment = interaction.options.getAttachment('sampul');
        const rakAttachment = interaction.options.getAttachment('foto_rak');
        
        let namaFileSampul = null;
        let namaFileRak = null;

        log('INFO', 'TAMBAH_BUKU', `Admin ${interaction.user.tag} memulai penambahan buku: ${namaBuku} (Kelas: ${tingkatKelas}), Stok: ${stok}.`);

        try {
            // Handle file uploads using the helper function
            if (sampulAttachment) {
                namaFileSampul = await saveAttachment(sampulAttachment, 'sampul');
            }
            if (rakAttachment) {
                namaFileRak = await saveAttachment(rakAttachment, 'rak');
            }

            const query = 'INSERT INTO buku (nama_buku, tingkat_kelas, total_stok, stok_tersedia, file_sampul, lokasi_rak) VALUES (?, ?, ?, ?, ?, ?)';
            await client.db.query(query, [namaBuku, tingkatKelas, stok, stok, namaFileSampul, namaFileRak]);

            const embed = new EmbedBuilder()
                .setColor('Green')
                .setTitle('✅ Buku Berhasil Ditambahkan')
                .addFields(
                    { name: 'Judul Buku', value: namaBuku },
                    { name: 'Tingkat Kelas', value: tingkatKelas },
                    { name: 'Total Stok', value: stok.toString() }
                )
                .setTimestamp();
            
            if (namaFileSampul) {
                embed.addFields({ name: 'Sampul', value: 'Gambar sampul berhasil ditambahkan.' });
            }
            if (namaFileRak) {
                embed.addFields({ name: 'Foto Rak', value: 'Foto lokasi rak berhasil ditambahkan.' });
            }

            await interaction.editReply({ embeds: [embed] });
            log('INFO', 'TAMBAH_BUKU_DB', `Buku '${namaBuku}' berhasil ditambahkan ke database.`);

        } catch (error) {
            log('ERROR', 'TAMBAH_BUKU_DB', error.message);
            await handleInteractionError(interaction);
        }
    },
};