/*
================================================================================
File: 📁 smanung-library-bot/deploy-commands.js
Tujuan: Skrip ini dijalankan sekali (atau setiap kali ada perubahan command)
untuk mendaftarkan semua slash command ke Discord. Tanpa ini, command tidak
akan muncul di server.
Cara menjalankan: Buka terminal dan ketik `node deploy-commands.js`
================================================================================
*/
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const commands = [];
// Path utama folder commands
const commandsPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandsPath).filter(f => fs.lstatSync(path.join(commandsPath, f)).isDirectory());

for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(folderPath, file);
        const command = require(filePath);

        if (command?.data && command?.execute) {
            commands.push(command.data.toJSON());
        } else {
            console.warn(`[WARNING] Command di ${filePath} tidak valid (harus punya "data" & "execute").`);
        }
    }
}

// Buat instance dari REST module
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// Deploy commands!
(async () => {
    try {
        console.log(`⏳ Memulai refresh ${commands.length} application (/) commands...`);

        const data = await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands },
        );

        console.log(`✅ Berhasil me-reload ${data.length} application (/) commands.`);
    } catch (error) {
        console.error('❌ Gagal deploy commands:', error);
    }
})();
