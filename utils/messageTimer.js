const { EmbedBuilder } = require('discord.js');

/**
 * Starts a self-destruct timer for a message, updating it with a countdown.
 * @param {import('discord.js').Message} message The message to apply the timer to.
 * @param {import('discord.js').Client} client The Discord client instance.
 * @param {number} initialDurationMs The total lifetime of the message in milliseconds.
 */
async function startMessageTimer(message, client, initialDurationMs) {
    if (!client.messageTimers) {
        client.messageTimers = new Map();
    }

    const UPDATE_INTERVAL_MS = 10 * 1000; // Update every 10 seconds
    const endTime = Date.now() + initialDurationMs;

    const updateMessage = async () => {
        const remainingMs = endTime - Date.now();
        const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));

        let timerText;
        if (remainingSeconds > 60) {
            const minutes = Math.floor(remainingSeconds / 60);
            const seconds = remainingSeconds % 60;
            timerText = `Pesan ini akan terhapus dalam ${minutes}m ${seconds}s`;
        } else if (remainingSeconds > 0) {
            timerText = `Pesan ini akan terhapus dalam ${remainingSeconds}s`;
        } else {
            timerText = `Pesan ini akan segera terhapus.`;
        }

        if (!message.embeds || message.embeds.length === 0) {
             clearInterval(client.messageTimers.get(message.id));
             client.messageTimers.delete(message.id);
             return;
        }
        const currentEmbed = EmbedBuilder.from(message.embeds[0]);
        currentEmbed.setFooter({ text: timerText });

        try {
            await message.edit({ embeds: [currentEmbed] });
        } catch (err) {
            clearInterval(client.messageTimers.get(message.id));
            client.messageTimers.delete(message.id);
            return;
        }

        if (remainingSeconds <= 0) {
            clearInterval(client.messageTimers.get(message.id));
            client.messageTimers.delete(message.id);
            try {
                await message.delete();
            } catch (err) {
                // Ignore errors if message is already gone
            }
        }
    };

    await updateMessage();

    const intervalId = setInterval(updateMessage, UPDATE_INTERVAL_MS);
    client.messageTimers.set(message.id, intervalId);
}

module.exports = startMessageTimer;
