const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, '../logs');
const logFile = path.join(logDir, 'history.log');

// Pastikan direktori logs ada
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

/**
 * Fungsi logging terpusat.
 * @param {'INFO' | 'WARN' | 'ERROR'} level - Level log (INFO, WARN, ERROR).
 * @param {string} service - Konteks atau service dari mana log berasal (misal: LOGIN, REGISTER, GUILD_MEMBER_ADD).
 * @param {string} message - Pesan log yang detail.
 */
function log(level, service, message) {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level}] [${service}] - ${message}\n`;

    // Tulis ke konsol
    if (level === 'ERROR') {
        console.error(formattedMessage.trim());
    } else {
        console.log(formattedMessage.trim());
    }

    // Tulis ke file log
    try {
        fs.appendFileSync(logFile, formattedMessage, 'utf8');
    } catch (error) {
        console.error('CRITICAL: Gagal menulis ke file log.', error);
    }
}

module.exports = { log };
