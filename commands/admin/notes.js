const { SlashCommandBuilder, ChannelType, PermissionsBitField, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { log } = require('../../utils/logger');
const { handleInteractionError } = require('../../utils/errorHandler'); // ✅ Tambah helper

// Helper function to get a note by ID
async function getNoteById(db, noteId) {
    const [rows] = await db.query('SELECT * FROM channel_notes WHERE id = ?', [noteId]);
    return rows.length > 0 ? rows[0] : null;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('notes')
        .setDescription('Mengelola catatan di channel.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Menambahkan catatan baru ke channel.')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel untuk memposting catatan.')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Melihat daftar catatan di channel.')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel untuk melihat catatan (default: channel saat ini).')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setDescription('Mengedit catatan yang sudah ada.')
                .addIntegerOption(option =>
                    option.setName('id')
                        .setDescription('ID catatan yang akan diedit (gunakan /notes list untuk melihat ID).')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Menghapus catatan.')
                .addIntegerOption(option =>
                    option.setName('id')
                        .setDescription('ID catatan yang akan dihapus (gunakan /notes list untuk melihat ID).')
                        .setRequired(true))),

    async execute(interaction, client) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral }); // ✅ Standar error handling

        const subcommand = interaction.options.getSubcommand();
        const db = client.db;

        try {
            switch (subcommand) {
                case 'add': {
                    const channel = interaction.options.getChannel('channel');
                    const modal = new ModalBuilder()
                        .setCustomId(`notes_add_modal_${channel.id}`)
                        .setTitle(`Tambah Catatan di #${channel.name}`);

                    const titleInput = new TextInputBuilder()
                        .setCustomId('note_title_input')
                        .setLabel("Judul Catatan")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true);

                    const contentInput = new TextInputBuilder()
                        .setCustomId('note_content_input')
                        .setLabel("Isi Catatan (mendukung Markdown)")
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(true);
                    
                    modal.addComponents(
                        new ActionRowBuilder().addComponents(titleInput),
                        new ActionRowBuilder().addComponents(contentInput)
                    );

                    await interaction.showModal(modal);
                    break;
                }
                case 'list': {
                    const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
                    const [notes] = await db.query('SELECT id, title, created_at FROM channel_notes WHERE channel_id = ? ORDER BY created_at DESC', [targetChannel.id]);

                    if (notes.length === 0) {
                        return await interaction.editReply({ content: `Tidak ada catatan di channel ${targetChannel}.` });
                    }

                    let description = `Daftar catatan di ${targetChannel}:\n\n`;
                    notes.forEach(note => {
                        description += `**ID:** ${note.id}\n`;
                        description += `**Judul:** ${note.title}\n`;
                        description += `**Dibuat:** <t:${Math.floor(new Date(note.created_at).getTime() / 1000)}:R>\n\n`;
                    });

                    const embed = new EmbedBuilder()
                        .setTitle('Daftar Catatan Channel')
                        .setDescription(description.substring(0, 4096))
                        .setColor('Blue');

                    await interaction.editReply({ embeds: [embed] });
                    break;
                }
                case 'edit': {
                    const noteId = interaction.options.getInteger('id');
                    const note = await getNoteById(db, noteId);

                    if (!note) {
                        return await interaction.editReply({ content: `Catatan dengan ID ${noteId} tidak ditemukan.` });
                    }

                    const modal = new ModalBuilder()
                        .setCustomId(`notes_edit_modal_${noteId}`)
                        .setTitle(`Edit Catatan: ${note.title}`);

                    const contentInput = new TextInputBuilder()
                        .setCustomId('note_content_input')
                        .setLabel("Isi Catatan (mendukung Markdown)")
                        .setStyle(TextInputStyle.Paragraph)
                        .setValue(note.content)
                        .setRequired(true);

                    const actionRow = new ActionRowBuilder().addComponents(contentInput);
                    modal.addComponents(actionRow);

                    await interaction.showModal(modal);
                    break;
                }
                case 'delete': {
                    const noteId = interaction.options.getInteger('id');
                    const note = await getNoteById(db, noteId);

                    if (!note) {
                        return await interaction.editReply({ content: `Catatan dengan ID ${noteId} tidak ditemukan.` });
                    }

                    try {
                        const channel = await client.channels.fetch(note.channel_id);
                        const message = await channel.messages.fetch(note.message_id);
                        await message.delete();
                        log('INFO', 'NOTES_DELETE_MSG', `Pesan catatan ID ${note.message_id} dihapus dari #${channel.name}.`);
                    } catch (msgError) {
                        log('WARN', 'NOTES_DELETE_MSG', `Gagal menghapus pesan catatan ID ${note.message_id} dari Discord: ${msgError.message}`);
                    }

                    await db.query('DELETE FROM channel_notes WHERE id = ?', [noteId]);
                    log('INFO', 'NOTES_DELETE_DB', `Catatan ID ${noteId} dihapus dari database oleh ${interaction.user.tag}.`);

                    await interaction.editReply({ content: `✅ Catatan dengan ID ${noteId} berhasil dihapus.` });
                    break;
                }
            }
        } catch (error) {
            log('ERROR', 'NOTES_COMMAND', error.message);
            await handleInteractionError(interaction);
        }
    },

    async handleModalSubmit(interaction, client) {
        const db = client.db;
        const userId = interaction.user.id;

        if (interaction.customId.startsWith('notes_add_modal')) {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const customIdParts = interaction.customId.split('_');
            const channelId = customIdParts[3];
            const title = interaction.fields.getTextInputValue('note_title_input');
            const content = interaction.fields.getTextInputValue('note_content_input');

            try {
                const targetChannel = await client.channels.fetch(channelId);
                if (!targetChannel) {
                    return await interaction.editReply({ content: '❌ Channel yang dituju tidak ditemukan.' });
                }

                const embed = new EmbedBuilder()
                    .setTitle(`📝 ${title}`)
                    .setDescription(content)
                    .setColor('Purple')
                    .setTimestamp();

                const message = await targetChannel.send({ embeds: [embed] });

                const [result] = await db.query(
                    'INSERT INTO channel_notes (channel_id, message_id, title, content, created_by_user_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
                    [channelId, message.id, title, content, userId, new Date()]
                );
                log('INFO', 'NOTES_ADD_DB', `Catatan baru (ID: ${result.insertId}) ditambahkan oleh ${interaction.user.tag}.`);

                await interaction.editReply({ content: `✅ Catatan baru dengan judul "**${title}**" berhasil ditambahkan di ${targetChannel}.` });

            } catch (error) {
                log('ERROR', 'NOTES_ADD_MODAL', error.message);
                await handleInteractionError(interaction);
            }

        } else if (interaction.customId.startsWith('notes_edit_modal')) {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const noteId = parseInt(interaction.customId.split('_')[3]);
            const newContent = interaction.fields.getTextInputValue('note_content_input');
            const note = await getNoteById(db, noteId);

            if (!note) {
                return await interaction.editReply({ content: `Catatan dengan ID ${noteId} tidak ditemukan.` });
            }

            try {
                await db.query('UPDATE channel_notes SET content = ?, last_updated_by_user_id = ?, last_updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newContent, userId, noteId]);
                log('INFO', 'NOTES_EDIT_DB', `Catatan ID ${noteId} diupdate oleh ${interaction.user.tag}.`);

                const targetChannel = await client.channels.fetch(note.channel_id);
                const message = await targetChannel.messages.fetch(note.message_id);

                const newEmbed = new EmbedBuilder()
                    .setTitle(`📝 ${note.title}`)
                    .setDescription(newContent)
                    .setColor('Purple')
                    .setTimestamp();

                await message.edit({ embeds: [newEmbed] });
                log('INFO', 'NOTES_EDIT_MSG', `Pesan catatan ID ${message.id} diupdate di #${targetChannel.name}.`);

                await interaction.editReply({ content: `✅ Catatan dengan ID ${noteId} berhasil diperbarui.` });

            } catch (error) {
                log('ERROR', 'NOTES_EDIT_MODAL', error.message);
                let errorMessage = '❌ Terjadi kesalahan saat mencoba memperbarui catatan.';
                if (error.code === 10008) {
                    errorMessage += '\nPesan asli mungkin telah dihapus. Anda perlu membuat catatan baru.';
                }
                await interaction.editReply({ content: errorMessage });
            }
        }
    }
};