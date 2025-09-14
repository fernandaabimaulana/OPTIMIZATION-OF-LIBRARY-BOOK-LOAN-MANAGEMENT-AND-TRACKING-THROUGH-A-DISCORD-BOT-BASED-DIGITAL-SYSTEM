// 📁 smanung-library-bot/commands/admin/set_denda.js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const db = require('../../utils/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set_denda')
        .setDescription('Atur biaya denda per jam keterlambatan.')
        .addIntegerOption(option =>
            option.setName('jumlah')
                .setDescription('Biaya denda per jam (dalam rupiah).')
                .setRequired(true)
        ),

    async execute(interaction) {
        if (!interaction.member.roles.cache.has(interaction.client.config.roles.adminPerpus)) {
            return interaction.reply({ content: '❌ Hanya admin perpustakaan yang bisa mengatur denda.', flags: MessageFlags.Ephemeral });
        }

        const jumlah = interaction.options.getInteger('jumlah');

        try {
            await db.query(
                'INSERT INTO app_config (config_key, config_value) VALUES ("biaya_denda_per_jam", ?) ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)',
                [jumlah]
            );

            await interaction.reply(`✅ Biaya denda berhasil diperbarui: **Rp ${jumlah.toLocaleString()} per jam**`);
        } catch (err) {
            console.error('DB Error (set_denda):', err.message);
            await interaction.reply({ content: '❌ Gagal memperbarui biaya denda di database.', flags: MessageFlags.Ephemeral });
        }
    }
};
