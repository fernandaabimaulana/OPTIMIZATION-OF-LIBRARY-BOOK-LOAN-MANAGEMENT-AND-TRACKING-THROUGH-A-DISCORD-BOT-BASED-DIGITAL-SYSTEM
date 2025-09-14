const { SlashCommandBuilder, EmbedBuilder, ChannelType, MessageFlags } = require('discord.js');
const { log } = require('../../utils/logger');
const { logAndReply } = require('../../utils/interaction-logger');
const { handleInteractionError } = require('../../utils/errorHandler'); // ✅ Tambah helper

module.exports = {
    data: new SlashCommandBuilder()
        .setName('debug')
        .setDescription('Perintah debugging khusus untuk Developer.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('guild')
                .setDescription('Menampilkan semua ID role dan channel di server.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('config')
                .setDescription('Menampilkan file konfigurasi yang sedang dimuat.')),

    async execute(interaction, client) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        if (!client.config.developerIds || !client.config.developerIds.includes(interaction.user.id)) {
            log('WARN', 'DEBUG_ACCESS_DENIED', `User ${interaction.user.tag} (ID: ${interaction.user.id}) mencoba mengakses perintah /debug.`);
            return interaction.editReply({ content: '❌ Anda tidak memiliki izin untuk menggunakan perintah ini.' });
        }

        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'guild': {
                    const guild = interaction.guild;
                    const owner = await guild.fetchOwner();

                    const embedsToSend = [];

                    // 1. Guild Overview Embed
                    const overviewEmbed = new EmbedBuilder()
                        .setTitle(`Server Overview: ${guild.name}`)
                        .setColor('#3498db')
                        .addFields(
                            { name: 'ID Server', value: `\`${guild.id}\``, inline: true },
                            { name: 'Owner', value: `${owner.user.tag} (\`${owner.id}\`)`, inline: true },
                            { name: 'Jumlah Anggota', value: `\`${guild.memberCount}\``, inline: true },
                            { name: 'Jumlah Roles', value: `\`${guild.roles.cache.size}\``, inline: true },
                            { name: 'Jumlah Channels', value: `\`${guild.channels.cache.size}\``, inline: true },
                            { name: 'Dibuat Pada', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: true }
                        );
                    embedsToSend.push(overviewEmbed);

                    // 2. Roles Embeds
                    const roles = guild.roles.cache
                        .sort((a, b) => b.position - a.position)
                        .filter(role => role.id !== guild.id);

                    let currentRoleDescription = '';
                    let rolePage = 1;
                    for (const role of roles.values()) {
                        const roleLine = `**${role.name}**: \`${role.id}\`\n`;
                        if (currentRoleDescription.length + roleLine.length > 4000) {
                            embedsToSend.push(new EmbedBuilder()
                                .setTitle(`Server Roles (Page ${rolePage})`)
                                .setDescription(currentRoleDescription)
                                .setColor('#e74c3c'));
                            currentRoleDescription = '';
                            rolePage++;
                        }
                        currentRoleDescription += roleLine;
                    }
                    if (currentRoleDescription.length > 0) {
                        embedsToSend.push(new EmbedBuilder()
                            .setTitle(`Server Roles (Page ${rolePage})`)
                            .setDescription(currentRoleDescription)
                            .setColor('#e74c3c'));
                    }

                    // 3. Channels Embeds
                    const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText || c.type === ChannelType.GuildNews);
                    const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice);
                    const categoryChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory);

                    const formatChannelList = (channelsCollection, typeName) => {
                        let description = '';
                        let page = 1;
                        let embeds = [];
                        for (const channel of channelsCollection.values()) {
                            const channelLine = `**#${channel.name}**: \`${channel.id}\`\n`;
                            if (description.length + channelLine.length > 4000) {
                                embeds.push(new EmbedBuilder()
                                    .setTitle(`Server Channels (${typeName}) (Page ${page})`)
                                    .setDescription(description)
                                    .setColor('#2ecc71'));
                                description = '';
                                page++;
                            }
                            description += channelLine;
                        }
                        if (description.length > 0) {
                            embeds.push(new EmbedBuilder()
                                .setTitle(`Server Channels (${typeName}) (Page ${page})`)
                                .setDescription(description)
                                .setColor('#2ecc71'));
                        }
                        return embeds;
                    };

                    embedsToSend.push(...formatChannelList(textChannels, 'Text'));
                    embedsToSend.push(...formatChannelList(voiceChannels, 'Voice'));
                    embedsToSend.push(...formatChannelList(categoryChannels, 'Category'));

                    // Send all embeds in batches
                    if (embedsToSend.length === 0) {
                        await interaction.editReply({ content: 'Tidak ada informasi server untuk ditampilkan.' });
                    } else {
                        for (let i = 0; i < embedsToSend.length; i += 10) {
                            const batch = embedsToSend.slice(i, i + 10);
                            if (i === 0) {
                                await interaction.editReply({ embeds: batch });
                            } else {
                                await interaction.followUp({ embeds: batch, flags: MessageFlags.Ephemeral });
                            }
                        }
                    }
                    break;
                }
                case 'config': {
                    const configString = JSON.stringify(client.config, null, 2);
                    const embed = new EmbedBuilder()
                        .setTitle('Loaded Bot Configuration')
                        .setDescription("```json\n" + configString.substring(0, 4000) + "\n```")
                        .setColor('Orange');
                    
                    await interaction.editReply({ embeds: [embed] });
                    break;
                }
            }
        } catch (error) {
            log('ERROR', 'DEBUG_COMMAND', `Error pada perintah /debug ${subcommand}: ${error.message}`);
            await handleInteractionError(interaction);
        }
    },
};