/*
================================================================================
File: 📁 smanung-library-bot/commands/perpus/kembalikan.js
Tujuan: Mengelola alur pengembalian buku dengan hak akses admin.
Versi: 2.3 (Simplified & Consolidated)
================================================================================
*/
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const updateStatus = require('../../utils/updateStatus');
const { handleInteractionError } = require('../../utils/errorHandler');
const { log } = require('../../utils/logger');
const { updateLeaderboard } = require('../../utils/leaderboardUpdater');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kembalikan')
        .setDescription('Mengkonfirmasi pengembalian buku (Hanya Admin).')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addStringOption(option =>
            option.setName('peminjaman')
                .setDescription('Pilih transaksi peminjaman yang akan dikembalikan.')
                .setRequired(true)
                .setAutocomplete(true)),

    async autocomplete(interaction, client) {
        const focusedValue = interaction.options.getFocused();
        let choices = [];
        try {
            const query = `
                SELECT p.id_peminjaman, b.nama_buku, k.nama_kelas, p.penanggung_jawab
                FROM peminjaman p
                JOIN buku b ON p.id_buku = b.id_buku
                JOIN kelas k ON p.id_kelas = k.id_kelas
                WHERE p.status = 'DIPINJAM'
                ORDER BY p.timestamp_pinjam DESC
            `;
            const [rows] = await client.db.query(query);
            choices = rows.map(row => ({
                name: `ID: ${row.id_peminjaman} - ${row.nama_buku} (Kelas: ${row.nama_kelas}, Peminjam: ${row.penanggung_jawab})`,
                value: row.id_peminjaman.toString()
            }));
        } catch (error) {
            log('ERROR', 'KEMBALIKAN_AUTOCOMPLETE', error.message);
            await interaction.respond([]);
            return;
        }
        
        const filtered = choices.filter(choice => choice.name.toLowerCase().includes(focusedValue.toLowerCase()));
        await interaction.respond(filtered.slice(0, 25));
    },

    async execute(interaction, client) {
        if (!interaction.member.roles.cache.has(client.config.roles.adminPerpus)) {
            return interaction.reply({ content: '❌ Anda tidak memiliki izin untuk menggunakan perintah ini.', flags: MessageFlags.Ephemeral });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const peminjamanId = interaction.options.getString('peminjaman');
        const db = client.db;

        try {
            await db.query('START TRANSACTION');

            const [peminjamanData] = await db.query('SELECT id_buku, jumlah_pinjam, status FROM peminjaman WHERE id_peminjaman = ? FOR UPDATE', [peminjamanId]);
            
            if (peminjamanData.length === 0 || peminjamanData[0].status === 'DIKEMBALIKAN') {
                await db.query('ROLLBACK');
                return interaction.editReply({ content: '❌ Data peminjaman tidak valid atau sudah dikembalikan.' });
            }
            
            const { id_buku, jumlah_pinjam } = peminjamanData[0];

            // Handle fine calculation, monitoring stop, and message update
            if (client.overdueMonitor) {
                await client.overdueMonitor.handleLoanReturn(parseInt(peminjamanId, 10));
            }

            await db.query("UPDATE peminjaman SET status = 'DIKEMBALIKAN', timestamp_kembali = NOW() WHERE id_peminjaman = ?", [peminjamanId]);
            await db.query('UPDATE buku SET stok_tersedia = stok_tersedia + ? WHERE id_buku = ?', [jumlah_pinjam, id_buku]);

            await db.query('COMMIT');

            await interaction.editReply({ content: '✅ Buku telah berhasil dikembalikan. Status channel akan diperbarui.' });
            await updateStatus(client, client.config.channels.statusBuku);
            await updateLeaderboard(client); // Update the leaderboard

        } catch (error) {
            await db.query('ROLLBACK');
            log('ERROR', 'KEMBALIKAN', error.message);
            await handleInteractionError(interaction);
        }
    },
};