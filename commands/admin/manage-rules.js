const { SlashCommandBuilder, ChannelType, PermissionsBitField, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { log } = require('../../utils/logger');

// Helper function to get config from DB
async function getConfig(db, key) {
    const [rows] = await db.query('SELECT config_value FROM app_config WHERE config_key = ?', [key]);
    return rows.length > 0 ? rows[0].config_value : null;
}

// Helper function to set config in DB
async function setConfig(db, key, value) {
    await db.query('INSERT INTO app_config (config_key, config_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE config_value = ?', [key, value, value]);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rules')
        .setDescription('Mengelola pesan peraturan di server.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('post')
                .setDescription('Mengirim pesan peraturan awal ke sebuah channel.')
                .addChannelOption(option => 
                    option.setName('channel')
                        .setDescription('Channel untuk mengirim pesan peraturan.')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('Melihat isi teks peraturan saat ini.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('update')
                .setDescription('Memperbarui isi teks peraturan.')),

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();
        const db = client.db;

        try {
            switch (subcommand) {
                case 'post': {
                    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                    const channel = interaction.options.getChannel('channel');
                    
                    let rulesContent = await getConfig(db, 'rules_content');
                    if (!rulesContent) {
                        rulesContent = 'Peraturan belum diatur. Gunakan `/rules update` untuk mengaturnya.';
                        await setConfig(db, 'rules_content', rulesContent);
                    }

                    const embed = new EmbedBuilder()
                        .setTitle('📜 Peraturan Server & Panduan Bot')
                        .setDescription(rulesContent)
                        .setColor(0x0099FF)
                        .setTimestamp();

                    const message = await channel.send({ embeds: [embed] });
                    
                    await setConfig(db, 'rules_channel_id', channel.id);
                    await setConfig(db, 'rules_message_id', message.id);

                    log('INFO', 'RULES_POST', `Pesan peraturan berhasil dikirim ke #${channel.name} oleh ${interaction.user.tag}.`);
                    await interaction.editReply(`✅ Pesan peraturan berhasil dikirim ke channel ${channel}.`);
                    break;
                }
                case 'view': {
                    console.log('DEBUG: Masuk ke subcommand view.');
                    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                    console.log('DEBUG: Setelah deferReply.');
                    let rulesContent;
                    try {
                        rulesContent = await getConfig(db, 'rules_content') || 'Peraturan belum diatur.';
                        console.log('DEBUG: Setelah getConfig. rulesContent:', rulesContent);
                    } catch (dbError) {
                        console.error('ERROR: Gagal mengambil rules_content dari DB:', dbError);
                        return interaction.editReply({ content: '❌ Terjadi kesalahan saat mengambil peraturan dari database.', flags: MessageFlags.Ephemeral });
                    }
                    const embed = new EmbedBuilder()
                        .setTitle('Isi Peraturan Saat Ini')
                        .setDescription(rulesContent)
                        .setColor(0xEEEEEE);
                    await interaction.editReply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                    console.log('DEBUG: Setelah editReply.');
                    break;
                }
                case 'update': {
                    const rulesContent = await getConfig(db, 'rules_content') || '';
                    
                    const modal = new ModalBuilder()
                        .setCustomId('rules_update_modal')
                        .setTitle('Perbarui Peraturan Server');

                    const contentInput = new TextInputBuilder()
                        .setCustomId('rules_content_input')
                        .setLabel("Isi Peraturan (mendukung Markdown)")
                        .setStyle(TextInputStyle.Paragraph)
                        .setValue(rulesContent)
                        .setRequired(true);
                    
                    const actionRow = new ActionRowBuilder().addComponents(contentInput);
                    modal.addComponents(actionRow);

                    await interaction.showModal(modal);
                    break;
                }
            }
        } catch (error) {
            log('ERROR', 'RULES_COMMAND', `Error pada perintah /rules: ${error.message}`);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: '❌ Terjadi kesalahan saat menjalankan perintah ini.', flags: MessageFlags.Ephemeral });
            } else {
                await interaction.followUp({ content: '❌ Terjadi kesalahan saat menjalankan perintah ini.', flags: MessageFlags.Ephemeral });
            }
        }
    },

    async handleModalSubmit(interaction, client) {
        if (interaction.customId !== 'rules_update_modal') return; 
        
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const db = client.db;
        const newContent = interaction.fields.getTextInputValue('rules_content_input');

        try {
            // 1. Update content in DB
            await setConfig(db, 'rules_content', newContent);
            log('INFO', 'RULES_UPDATE_DB', `Konten peraturan diupdate oleh ${interaction.user.tag}.`);

            // 2. Get message and channel IDs from DB
            const channelId = await getConfig(db, 'rules_channel_id');
            const messageId = await getConfig(db, 'rules_message_id');

            if (!channelId || !messageId) {
                return interaction.editReply({ content: '⚠️ Konten berhasil disimpan, tapi pesan peraturan belum pernah dikirim. Gunakan `/rules post` untuk mengirimnya pertama kali.' });
            }

            // 3. Fetch and edit the message
            const channel = await client.channels.fetch(channelId);
            const message = await channel.messages.fetch(messageId);

            const newEmbed = new EmbedBuilder()
                .setTitle('📜 Peraturan Server & Panduan Bot')
                .setDescription(newContent)
                .setColor(0x0099FF)
                .setTimestamp();

            await message.edit({ embeds: [newEmbed] });
            log('INFO', 'RULES_UPDATE_MSG', `Pesan peraturan di #${channel.name} berhasil diupdate.`);

            await interaction.editReply({ content: '✅ Konten peraturan berhasil disimpan dan pesan di channel telah diperbarui.' });

        } catch (error) {
            log('ERROR', 'RULES_MODAL', `Gagal update peraturan dari modal: ${error.message}`);
            let errorMessage = '❌ Terjadi kesalahan saat mencoba memperbarui peraturan.';
            if (error.code === 10008) { // Unknown Message
                errorMessage += '\nPesan asli mungkin telah dihapus. Gunakan `/rules post` untuk mengirim pesan baru.';
            }
            await interaction.editReply({ content: errorMessage });
        }
    }
};