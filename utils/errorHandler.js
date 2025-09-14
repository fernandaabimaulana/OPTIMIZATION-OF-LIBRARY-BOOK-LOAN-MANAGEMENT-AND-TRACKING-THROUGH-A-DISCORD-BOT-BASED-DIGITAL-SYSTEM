// utils/errorHandler.js
const { log } = require('./logger');

/**
 * Handles sending an error message back to the user for an interaction.
 * It checks if the interaction has already been replied to or deferred, 
 * and uses followUp to avoid the 'Unknown Interaction' error.
 * @param {import('discord.js').Interaction} interaction The interaction that failed.
 * @param {string} [message='❌ Terjadi kesalahan saat menjalankan perintah ini.'] The error message to display.
 */
async function handleInteractionError(
    interaction,
    message = '❌ Terjadi kesalahan saat menjalankan perintah ini.'
) {
    // Log the basic error info for context
    log('ERROR', 'INTERACTION_HANDLER', `Handling error for command: ${interaction.commandName}. User: ${interaction.user.tag}`);

    // Check if the interaction has already been handled
    if (interaction.replied || interaction.deferred) {
        try {
            await interaction.followUp({ content: message, ephemeral: true });
        } catch (e) {
            log('ERROR', 'INTERACTION_HANDLER_FOLLOWUP', `Failed to send followUp error message: ${e.message}`);
        }
    } else {
        try {
            await interaction.reply({ content: message, ephemeral: true });
        } catch (e) {
            log('ERROR', 'INTERACTION_HANDLER_REPLY', `Failed to send initial error reply: ${e.message}`);
        }
    }
}

module.exports = { handleInteractionError };
