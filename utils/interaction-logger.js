const { EmbedBuilder, MessageFlags } = require('discord.js');
const { log } = require('./logger');

/**
 * Sends an ephemeral reply and logs the action to a dedicated log channel.
 * @param {import('discord.js').CommandInteraction} interaction The interaction object.
 * @param {import('discord.js').Client} client The bot client.
 * @param {import('discord.js').InteractionReplyOptions} replyOptions The reply options for the user.
 * @param {string} [title='Ephemeral Reply Sent'] An optional title for the log message.
 */
async function logAndReply(interaction, client, replyOptions, title = 'Ephemeral Reply Sent') {
    try {
        const finalReplyOptions = { ...replyOptions, flags: MessageFlags.Ephemeral };

        if (interaction.replied || interaction.deferred) {
            await interaction.editReply(finalReplyOptions);
        } else {
            await interaction.reply(finalReplyOptions);
        }

        const logChannelId = client.config.channels.botLogs;
        if (!logChannelId) return;

        const logChannel = await client.channels.fetch(logChannelId).catch(() => null);
        if (!logChannel) {
            return log('WARN', 'LOG_SEND', `Log channel with ID ${logChannelId} not found.`);
        }

        let logDescription = '';
        if (replyOptions.content) {
            logDescription += `**Content:**\n>>> ${replyOptions.content}`;
        }
        if (replyOptions.embeds && replyOptions.embeds.length > 0) {
            logDescription += `\n**Embeds:** ${replyOptions.embeds.length} embed(s) were sent.`;
        }
        if (replyOptions.files && replyOptions.files.length > 0) {
            const fileNames = replyOptions.files.map(f => f.name || 'file.txt').join(', ');
            logDescription += `\n**Files:** ${fileNames}`;
        }

        const logEmbed = new EmbedBuilder()
            .setColor(0x778899) // LightSlateGray
            .setTitle(title)
            .setDescription(logDescription.substring(0, 4096))
            .addFields(
                { name: 'Command', value: `/${interaction.commandName}${interaction.options.getSubcommand(false) ? ' ' + interaction.options.getSubcommand(false) : ''}` , inline: true },
                { name: 'User', value: `${interaction.user.tag}`, inline: true },
                { name: 'In Channel', value: `${interaction.channel}`, inline: true }
            )
            .setTimestamp();

        await logChannel.send({ embeds: [logEmbed] });

    } catch (error) {
        log('ERROR', 'LOG_AND_REPLY', `Failed to log and reply: ${error.message}`);
    }
}

module.exports = { logAndReply };
