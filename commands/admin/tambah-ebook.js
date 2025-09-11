/*
================================================================================
File: 📁 smanung-library-bot/commands/admin/tambah-ebook.js
Tujuan: Perintah untuk admin menambahkan data e-book baru ke database dan menyimpan file PDF.
================================================================================
*/
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const axios = require('axios');
const { log } = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tambah-ebook')
        .setDescription('Menambahkan e-book baru ke dalam inventaris perpustakaan digital.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild) // Hanya untuk admin server
        .addStringOption(option =>
            option.setName('judul')
                .setDescription('Judul lengkap e-book.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('pdf_url')
                .setDescription('URL langsung ke file PDF online.')
                .setRequired(true)) // Make URL required
        .addAttachmentOption(option => 
            option.setName('sampul')
                .setDescription('File gambar sampul e-book (JPG/PNG).')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('penulis')
                .setDescription('Nama penulis e-book.')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('deskripsi')
                .setDescription('Deskripsi singkat e-book.')
                .setRequired(false)),

    async execute(interaction, client) {
        // Cek izin khusus role adminPerpus
        if (!interaction.member.roles.cache.has(client.config.roles.adminPerpus)) {
            return interaction.reply({ content: '❌ Anda tidak memiliki izin untuk menggunakan perintah ini.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true }); // Balasan ephemeral karena ini perintah admin

        const judul = interaction.options.getString('judul');
        const penulis = interaction.options.getString('penulis') || 'Tidak Diketahui';
        const deskripsi = interaction.options.getString('deskripsi') || 'Tidak ada deskripsi.';
        const pdfUrlInput = interaction.options.getString('pdf_url');
        const sampulAttachment = interaction.options.getAttachment('sampul');
        let namaFileSampul = null;

        let finalPdfSource = ''; // This will always store the external URL

        try {
            // Handle PDF URL input
            try {
                const url = new URL(pdfUrlInput);
                if (!url.protocol.startsWith('http')) {
                    return interaction.editReply({ content: '❌ URL PDF harus dimulai dengan http:// atau https://.' });
                }
                finalPdfSource = pdfUrlInput;
            } catch (e) {
                return interaction.editReply({ content: '❌ URL PDF tidak valid.' });
            }

            // Handle file upload for cover
            if (sampulAttachment) {
                if (!['image/jpeg', 'image/png'].includes(sampulAttachment.contentType)) {
                    return interaction.editReply({ content: '❌ Format file sampul harus JPG atau PNG.', ephemeral: true });
                }

                namaFileSampul = `${Date.now()}-${sampulAttachment.name}`;
                const savePath = path.join(__dirname, '..', '..', 'public', 'sampul', namaFileSampul);
                
                const dirPath = path.dirname(savePath);
                if (!fs.existsSync(dirPath)) {
                    fs.mkdirSync(dirPath, { recursive: true });
                }

                const response = await axios({
                    method: 'get',
                    url: sampulAttachment.url,
                    responseType: 'stream'
                });
                const writer = fs.createWriteStream(savePath);
                response.data.pipe(writer);

                await new Promise((resolve, reject) => {
                    writer.on('finish', resolve);
                    writer.on('error', reject);
                });

                log('INFO', 'TAMBAH_EBOOK_FILE', `File sampul e-book '${namaFileSampul}' berhasil disimpan.`);
            }

            // Simpan data e-book ke database
            const query = 'INSERT INTO ebooks (judul, penulis, deskripsi, nama_file, uploader_id, file_sampul) VALUES (?, ?, ?, ?, ?, ?)';
            await client.db.query(query, [judul, penulis, deskripsi, finalPdfSource, interaction.user.id, namaFileSampul]);

            const embed = new EmbedBuilder()
                .setColor('Green')
                .setTitle('✅ E-book Berhasil Ditambahkan')
                .addFields(
                    { name: 'Judul E-book', value: judul },
                    { name: 'Penulis', value: penulis },
                    { name: 'Sumber PDF', value: finalPdfSource.length > 100 ? finalPdfSource.substring(0, 97) + '...' : finalPdfSource }
                )
                .setTimestamp();

            if (namaFileSampul) {
                embed.addFields({ name: 'Sampul', value: 'Gambar sampul berhasil ditambahkan.' });
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error saat menambahkan e-book:', error);
            await interaction.editReply({ content: '❌ Terjadi kesalahan saat menambahkan e-book ke database.' });
        }
    },
};