const { SlashCommandBuilder, AttachmentBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const ExcelJS = require('exceljs');
const dayjs = require('dayjs');
require('dayjs/locale/id');
dayjs.locale('id');

const { log } = require('../../utils/logger'); // ✅ tambahkan logging
const { handleInteractionError } = require('../../utils/errorHandler'); // ✅ tambahkan helper

module.exports = {
    data: new SlashCommandBuilder()
        .setName('export_peminjaman')
        .setDescription('Ekspor seluruh data peminjaman ke file Excel (.xlsx)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction, client) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });


        try {
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

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Data Peminjaman');

            worksheet.columns = [
                { header: 'ID', key: 'id_peminjaman', width: 10 },
                { header: 'Buku', key: 'nama_buku', width: 30 },
                { header: 'Kelas', key: 'nama_kelas', width: 15 },
                { header: 'Jumlah', key: 'jumlah_pinjam', width: 10 },
                { header: 'Penanggung Jawab', key: 'penanggung_jawab', width: 25 },
                { header: 'Guru Pengajar', key: 'nama_guru_pengajar', width: 25 },
                { header: 'Status', key: 'status', width: 15 },
                { header: 'Nama Admin', key: 'nama_admin', width: 25 },
                { header: 'Hari Pinjam', key: 'hari_pinjam', width: 15 },
                { header: 'Tanggal Pinjam', key: 'tgl_pinjam', width: 20 },
                { header: 'Jam Pinjam', key: 'jam_pinjam', width: 15 },
                { header: 'Tanggal Kembali', key: 'tgl_kembali', width: 20 },
                { header: 'Jam Kembali', key: 'jam_kembali', width: 15 },
            ];

            worksheet.getRow(1).font = { bold: true };

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
                    nama_admin: row.nama_admin || 'N/A',
                    hari_pinjam: tglPinjam ? tglPinjam.format('dddd') : '-',
                    tgl_pinjam: tglPinjam ? tglPinjam.format('DD MMMM YYYY') : '-',
                    jam_pinjam: tglPinjam ? tglPinjam.format('HH:mm:ss') : '-',
                    tgl_kembali: tglKembali ? tglKembali.format('DD MMMM YYYY') : '-',
                    jam_kembali: tglKembali ? tglKembali.format('HH:mm:ss') : '-',
                };
            });

            worksheet.addRows(formattedRows);

            const buffer = await workbook.xlsx.writeBuffer();

            const attachment = new AttachmentBuilder(buffer, { name: `export_peminjaman_${dayjs().format('YYYY-MM-DD')}.xlsx` });
            await interaction.editReply({ content: '✅ Data peminjaman berhasil diekspor:', files: [attachment] });

            log('INFO', 'EXPORT_PEMINJAMAN', `Data berhasil diekspor oleh ${interaction.user.tag}.`);

        } catch (error) {
            log('ERROR', 'EXPORT_PEMINJAMAN', error.message);
            await handleInteractionError(interaction); // ✅ konsisten
        }
    },
};
