/*
================================================================================
File: 📁 smanung-library-bot/commands/admin/bayar-denda.js
Tujuan: Perintah untuk admin mencatat pembayaran denda dari pengguna.
================================================================================
*/
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { handleInteractionError } = require('../../utils/errorHandler');
const { log } = require('../../utils/logger');
const { updateLeaderboard } = require('../../utils/leaderboardUpdater');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bayar_denda')
        .setDescription('Mencatat pembayaran denda dari seorang pengguna.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addUserOption(option =>
            option.setName('pengguna')
                .setDescription('Pengguna yang akan membayar denda.')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('jumlah')
                .setDescription('Jumlah yang dibayarkan (misal: 5000).')
                .setRequired(true)),

    async execute(interaction, client) {
        if (!interaction.member.roles.cache.has(client.config.roles.adminPerpus)) {
            return interaction.reply({ content: '❌ Anda tidak memiliki izin untuk menggunakan perintah ini.', flags: MessageFlags.Ephemeral });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const targetUser = interaction.options.getUser('pengguna');
        const amountPaid = interaction.options.getInteger('jumlah');
        const db = client.db;

        if (amountPaid <= 0) {
            return interaction.editReply({ content: '❌ Jumlah pembayaran harus lebih dari nol.' });
        }

        try {
            await db.query('START TRANSACTION');

            const [[userRecord]] = await db.query('SELECT total_denda_tertunggak FROM pengguna WHERE discord_id = ? FOR UPDATE', [targetUser.id]);

            if (!userRecord) {
                await db.query('ROLLBACK');
                return interaction.editReply({ content: `❌ Pengguna ${targetUser.tag} tidak ditemukan di database.` });
            }

            const currentFine = userRecord.total_denda_tertunggak;

            if (currentFine === 0) {
                await db.query('ROLLBACK');
                return interaction.editReply({ content: `✅ Pengguna ${targetUser.tag} tidak memiliki denda tertunggak.` });
            }

            if (amountPaid > currentFine) {
                await db.query('ROLLBACK');
                return interaction.editReply({ content: `❌ Jumlah pembayaran (Rp ${amountPaid.toLocaleString('id-ID')}) lebih besar dari total denda (Rp ${currentFine.toLocaleString('id-ID')}).` });
            }

            await db.query('UPDATE pengguna SET total_denda_tertunggak = total_denda_tertunggak - ? WHERE discord_id = ?', [amountPaid, targetUser.id]);

            await db.query('COMMIT');

            const newFine = currentFine - amountPaid;

            log('INFO', 'BAYAR_DENDA', `Admin ${interaction.user.tag} mencatat pembayaran denda dari ${targetUser.tag} sebesar Rp ${amountPaid}. Sisa: Rp ${newFine}`);

            await interaction.editReply({
                content: `✅ Pembayaran denda untuk **${targetUser.tag}** sebesar **Rp ${amountPaid.toLocaleString('id-ID')}** berhasil dicatat.
` +
                         `Sisa denda mereka sekarang adalah **Rp ${newFine.toLocaleString('id-ID')}**.`
            });

            // Update leaderboard untuk merefleksikan perubahan
            await updateLeaderboard(client);

        } catch (error) {
            await db.query('ROLLBACK');
            log('ERROR', 'BAYAR_DENDA', `Error saat memproses pembayaran denda untuk ${targetUser.tag}: ${error.message}`);
            await handleInteractionError(interaction);
        }
    },
};