const { SlashCommandBuilder, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
const ExcelJS = require('exceljs');
const dayjs = require('dayjs'); // <-- Ditambahkan: Import dayjs untuk format waktu
require('dayjs/locale/id'); // <-- Ditambahkan: Gunakan locale Indonesia untuk nama hari
dayjs.locale('id');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('export_peminjaman')
        .setDescription('Ekspor seluruh data peminjaman ke file Excel (.xlsx)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction, client) {
        // Cek role tidak diperlukan jika sudah menggunakan setDefaultMemberPermissions
        // Namun, jika ingin lebih spesifik, pengecekan role bisa dipertahankan.
        // if (!interaction.member.roles.cache.has(client.config.roles.adminPerpus)) {
        //     return interaction.reply({ content: '❌ Anda tidak memiliki izin untuk menggunakan perintah ini.', ephemeral: true });
        // }

        await interaction.deferReply({ ephemeral: true });

        try {
            // Langkah 1: Modifikasi Query SQL untuk menyertakan nama_admin
            // Menggunakan LEFT JOIN untuk memastikan peminjaman yang tidak memiliki admin (misal: data lama) tetap muncul.
            const [rows] = await client.db.query(`
                SELECT 
                    p.id_peminjaman, 
                    b.nama_buku, 
                    k.nama_kelas, 
                    p.jumlah_pinjam, 
                    p.penanggung_jawab, 
                    p.nama_guru_pengajar, 
                    p.timestamp_pinjam, 
                    p.timestamp_kembali, 
                    p.status,
                    a.nama_admin 
                FROM peminjaman p
                JOIN buku b ON p.id_buku = b.id_buku
                JOIN kelas k ON p.id_kelas = k.id_kelas
                LEFT JOIN admin a ON p.id_admin = a.id_admin
                ORDER BY p.timestamp_pinjam ASC
            `);

            // Buat workbook dan worksheet
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Data Peminjaman');

            // Langkah 2: Definisikan ulang kolom-kolom di Excel
            worksheet.columns = [
                { header: 'ID', key: 'id_peminjaman', width: 10 },
                { header: 'Buku', key: 'nama_buku', width: 30 },
                { header: 'Kelas', key: 'nama_kelas', width: 15 },
                { header: 'Jumlah', key: 'jumlah_pinjam', width: 10 },
                { header: 'Penanggung Jawab', key: 'penanggung_jawab', width: 25 },
                { header: 'Guru Pengajar', key: 'nama_guru_pengajar', width: 25 },
                { header: 'Status', key: 'status', width: 15 },
                { header: 'Nama Admin', key: 'nama_admin', width: 25 }, // Kolom baru
                { header: 'Hari Pinjam', key: 'hari_pinjam', width: 15 }, // Kolom baru
                { header: 'Tanggal Pinjam', key: 'tgl_pinjam', width: 20 }, // Kolom lama (diperjelas)
                { header: 'Jam Pinjam', key: 'jam_pinjam', width: 15 }, // Kolom baru
                { header: 'Tanggal Kembali', key: 'tgl_kembali', width: 20 }, // Kolom lama (diperjelas)
                { header: 'Jam Kembali', key: 'jam_kembali', width: 15 }, // Kolom baru
            ];
            
            // Mengatur style header agar tebal
            worksheet.getRow(1).font = { bold: true };


            // Langkah 3: Proses dan format data sebelum dimasukkan ke Excel
            const formattedRows = rows.map(row => {
                const tglPinjam = row.timestamp_pinjam ? dayjs(row.timestamp_pinjam) : null;
                const tglKembali = row.timestamp_kembali ? dayjs(row.timestamp_kembali) : null;

                return {
                    id_peminjaman: row.id_peminjaman,
                    nama_buku: row.nama_buku,
                    nama_kelas: row.nama_kelas,
                    jumlah_pinjam: row.jumlah_pinjam,
                    penanggung_jawab: row.penanggung_jawab,
                    nama_guru_pengajar: row.nama_guru_pengajar,
                    status: row.status,
                    nama_admin: row.nama_admin || 'N/A', // Jika admin null, tampilkan N/A
                    hari_pinjam: tglPinjam ? tglPinjam.format('dddd') : '-', // Format nama hari
                    tgl_pinjam: tglPinjam ? tglPinjam.format('DD MMMM YYYY') : '-', // Format tanggal
                    jam_pinjam: tglPinjam ? tglPinjam.format('HH:mm:ss') : '-', // Format jam
                    tgl_kembali: tglKembali ? tglKembali.format('DD MMMM YYYY') : '-',
                    jam_kembali: tglKembali ? tglKembali.format('HH:mm:ss') : '-',
                };
            });

            // Isi data yang sudah diformat
            worksheet.addRows(formattedRows);

            // Simpan ke buffer
            const buffer = await workbook.xlsx.writeBuffer();

            // Kirim file ke Discord
            const attachment = new AttachmentBuilder(buffer, { name: `export_peminjaman_${dayjs().format('YYYY-MM-DD')}.xlsx` });
            await interaction.editReply({ content: '✅ Data peminjaman berhasil diekspor:', files: [attachment] });

        } catch (error) {
            console.error('Export peminjaman error:', error);
            await interaction.editReply({ content: '❌ Terjadi kesalahan saat ekspor data.' });
        }
    },
};