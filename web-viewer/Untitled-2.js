/*
================================================================================
File: 📁 smanung-library-bot/commands/admin/tambah-ebook.js
Tujuan: Perintah untuk admin menambahkan data e-book baru ke database dan menyimpan file PDF.
================================================================================
*/
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('node:fs/promises');
const path = require('node:path');
const axios = require('axios');

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
            option.setName('penulis')
                .setDescription('Nama penulis e-book.')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('deskripsi')
                .setDescription('Deskripsi singkat e-book.')
                .setRequired(false))
        .addAttachmentOption(option =>
            option.setName('file_pdf')
                .setDescription('File PDF e-book yang akan diunggah.')
                .setRequired(true)),

    async execute(interaction, client) {
        // Cek izin khusus role adminPerpus
        if (!interaction.member.roles.cache.has(client.config.roles.adminPerpus)) {
            return interaction.reply({ content: '❌ Anda tidak memiliki izin untuk menggunakan perintah ini.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true }); // Balasan ephemeral karena ini perintah admin

        const judul = interaction.options.getString('judul');
        const penulis = interaction.options.getString('penulis') || 'Tidak Diketahui';
        const deskripsi = interaction.options.getString('deskripsi') || 'Tidak ada deskripsi.';
        const filePdf = interaction.options.getAttachment('file_pdf');

        // Validasi tipe file
        if (filePdf.contentType !== 'application/pdf') {
            return interaction.editReply({ content: '❌ File yang diunggah harus berformat PDF.' });
        }

        try {
            // Buat nama file unik
            const uniqueFileName = `${Date.now()}-${filePdf.name}`;
            const filePath = path.join(process.cwd(), 'smanung', 'public', 'ebooks', uniqueFileName);

            // Unduh file PDF dari Discord
            const response = await axios.get(filePdf.url, { responseType: 'arraybuffer' });
            await fs.writeFile(filePath, response.data);

            // Simpan data e-book ke database
            const query = 'INSERT INTO ebooks (judul, penulis, deskripsi, nama_file, uploader_id) VALUES (?, ?, ?, ?, ?)';
            await client.db.query(query, [judul, penulis, deskripsi, uniqueFileName, interaction.user.id]);

            const embed = new EmbedBuilder()
                .setColor('Green')
                .setTitle('✅ E-book Berhasil Ditambahkan')
                .addFields(
                    { name: 'Judul E-book', value: judul },
                    { name: 'Penulis', value: penulis },
                    { name: 'Nama File Tersimpan', value: uniqueFileName }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error saat menambahkan e-book:', error);
            await interaction.editReply({ content: '❌ Terjadi kesalahan saat menambahkan e-book ke database atau menyimpan file.' });
        }
    },
};