const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../../utils/db');
const { handleInteractionError } = require('../../utils/errorHandler'); // ✅ Tambah helper
const { log } = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('diskusi')
        .setDescription('Memulai diskusi e-book di channel #🧩sharing.')
        .addStringOption(option =>
            option.setName('nama_ebook')
                .setDescription('Nama e-book yang ingin didiskusikan.')
                .setRequired(true)
                .setAutocomplete(true))
        .addStringOption(option =>
            option.setName('pertanyaan')
                .setDescription('Pertanyaan untuk memulai diskusi.')
                .setRequired(true))
        .addUserOption(option =>
            option.setName('ajakdiskusi')
                .setDescription('Ajak seorang peserta untuk diskusi.')
                .setRequired(true)),
    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);
        if (focusedOption.name === 'nama_ebook') {
            const focusedValue = focusedOption.value.toLowerCase();
            try {
                const query = 'SELECT judul FROM ebooks WHERE judul LIKE ? LIMIT 10';
                const [rows] = await db.query(query, [`%${focusedValue}%`]);
                const choices = rows.map(row => row.judul);
                await interaction.respond(
                    choices.map(choice => ({ name: choice, value: choice })),
                );
            } catch (error) {
                log('ERROR', 'DISKUSI_AUTOCOMPLETE', error.message);
                await interaction.respond([]);
            }
        }
    },
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const ebookName = interaction.options.getString('nama_ebook');
            const question = interaction.options.getString('pertanyaan');
            const invitedUser = interaction.options.getUser('ajakdiskusi');

            // Cek ketersediaan e-book
            const [ebookExists] = await db.query('SELECT id FROM ebooks WHERE judul = ?', [ebookName]);
            if (ebookExists.length === 0) {
                return interaction.editReply({ content: `E-book dengan nama "${ebookName}" tidak ditemukan di database.`, flags: MessageFlags.Ephemeral });
            }

            if (invitedUser.bot) {
                return interaction.editReply({ content: 'Anda tidak bisa mengajak bot untuk berdiskusi.', flags: MessageFlags.Ephemeral });
            }

            if (invitedUser.id === interaction.user.id) {
                return interaction.editReply({ content: 'Anda tidak bisa mengajak diri sendiri untuk berdiskusi.', flags: MessageFlags.Ephemeral });
            }

            const discussionChannel = interaction.guild.channels.cache.find(channel => channel.name === '🧩sharing');
            if (!discussionChannel) {
                return interaction.editReply({ content: 'Channel #🧩sharing tidak ditemukan. Silakan buat channel tersebut terlebih dahulu.', flags: MessageFlags.Ephemeral });
            }

            const embed = {
                color: 0x0099ff,
                title: `Diskusi E-book: ${ebookName}`,
                description: `**Pertanyaan Awal:**\n>>> ${question}`,
                fields: [
                    { name: 'Tukang Nanya', value: interaction.user.toString(), inline: true },
                    { name: 'Calon Tukang Jawab', value: invitedUser.toString(), inline: true },
                    { name: 'Status', value: 'Menunggu undangan diterima...', inline: false },
                ],
                footer: { text: 'Calon Tukang Jawab harus menekan tombol di bawah untuk memulai.' },
                timestamp: new Date().toISOString(),
            };

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`accept_discussion_${interaction.user.id}_${invitedUser.id}`)
                        .setLabel('Terima Undangan Diskusi')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`decline_discussion_${interaction.user.id}_${invitedUser.id}`)
                        .setLabel('Tolak')
                        .setStyle(ButtonStyle.Danger),
                );

            await discussionChannel.send({
                content: `Hei ${invitedUser}, ada undangan diskusi dari ${interaction.user}!`,
                embeds: [embed],
                components: [row],
            });

            await interaction.editReply({ content: `Permintaan diskusi tentang e-book "${ebookName}" telah dikirim ke channel #🧩sharing.`, flags: MessageFlags.Ephemeral });
        } catch (error) {
            log('ERROR', 'DISKUSI', error.message);
            await handleInteractionError(interaction);
        }
    },

    async handleButton(interaction, client) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        try {
            const parts = interaction.customId.split('_');
            const decision = parts[0]; // 'accept' or 'decline'
            const initiatorId = parts[2];
            const invitedId = parts[3];

            // Verify that the user clicking the button is the one who was invited.
            if (interaction.user.id !== invitedId) {
                return interaction.editReply({ content: 'Anda tidak diundang ke diskusi ini.' });
            }

            const originalMessage = interaction.message;
            const originalEmbed = originalMessage.embeds[0];

            if (!originalEmbed) {
                log('ERROR', 'DISKUSI_BUTTON', 'Could not find original embed for discussion interaction.');
                return interaction.editReply({ content: 'Terjadi kesalahan: tidak dapat menemukan embed asli.' });
            }

            if (decision === 'accept') {
                // Handle acceptance
                const updatedEmbed = EmbedBuilder.from(originalEmbed)
                    .setColor(0x00FF00) // Green
                    .setFields(
                        ...originalEmbed.fields.filter(f => f.name !== 'Status'),
                        { name: 'Status', value: 'Diskusi diterima! Silakan lanjutkan di thread.', inline: false }
                    )
                    .setFooter({ text: 'Diskusi telah dimulai.' });

                const threadName = `Diskusi: ${originalEmbed.title.replace('Diskusi E-book: ', '')}`;
                const thread = await originalMessage.startThread({
                    name: threadName.substring(0, 100),
                    autoArchiveDuration: 60,
                    reason: `Diskusi untuk e-book ${originalEmbed.title}`.substring(0, 100),
                });

                await thread.send({
                    content: `Selamat datang di ruang diskusi, <@${initiatorId}> dan <@${invitedId}>! Silakan mulai diskusinya.\n\n${originalEmbed.description}`
                });

                await originalMessage.edit({ embeds: [updatedEmbed], components: [] });
                await interaction.editReply({ content: 'Diskusi telah dimulai di thread baru!' });

            } else if (decision === 'decline') {
                // Handle decline
                const updatedEmbed = EmbedBuilder.from(originalEmbed)
                    .setColor(0xFF0000) // Red
                    .setFields(
                        ...originalEmbed.fields.filter(f => f.name !== 'Status'),
                        { name: 'Status', value: 'Diskusi ditolak oleh calon tukang jawab.', inline: false }
                    )
                    .setFooter({ text: 'Diskusi tidak akan dimulai.' });

                await originalMessage.edit({ embeds: [updatedEmbed], components: [] });
                await interaction.editReply({ content: 'Anda telah menolak diskusi.' });
            }
        } catch (error) {
            log('ERROR', 'DISKUSI_BUTTON', error.message);
            await handleInteractionError(interaction);
        }
    }
};