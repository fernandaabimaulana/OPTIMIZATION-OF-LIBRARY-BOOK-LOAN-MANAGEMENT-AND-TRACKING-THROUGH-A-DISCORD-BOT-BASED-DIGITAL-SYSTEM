/*
================================================================================
File: 📁 smanung-library-bot/index.js
Tujuan: File utama (entry point) untuk bot Discord Perpustakaan.
        Mengelola koneksi, memuat perintah, dan menangani semua interaksi.
================================================================================
*/

// Memuat modul utilitas dan pustaka yang diperlukan
const generateBookListEmbed = require('./utils/postBookList');
const fs = require('fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const dayjs = require('dayjs');
const duration = require('dayjs/plugin/duration');
dayjs.extend(duration);
const relativeTime = require('dayjs/plugin/relativeTime');
dayjs.extend(relativeTime);
require('dayjs/locale/id');
dayjs.locale('id');

const updateStatus = require('./utils/updateStatus');
const startTimerSystem = require('./utils/timerSystem');
const { log } = require('./utils/logger');
const startMessageTimer = require('./utils/messageTimer'); // Import the new utility

require('dotenv').config();

// --- Server Web Express untuk E-book ---
const express = require('express');
const app = express();
const WEB_PORT = process.env.WEB_PORT || 3001;
app.use('/ebooks', express.static(path.join(__dirname, 'public', 'ebooks')));
app.use('/', express.static(path.join(__dirname, 'web-viewer')));
app.get('/view', (req, res) => {
    res.sendFile(path.join(__dirname, 'web-viewer', 'index.html'));
});
// --- Akhir Server Web ---

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

client.db = require('./utils/db.js');
client.config = require('./config.json');
client.timers = new Map();
client.messageTimers = new Map();

// --- Pemuatan Perintah ---
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(folderPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            log('INFO', 'COMMAND_LOADER', `Perintah /${command.data.name} berhasil dimuat.`);
        }
    }
}
// --- Akhir Pemuatan Perintah ---

// --- Pemuatan Event ---
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args, client));
	} else {
		client.on(event.name, (...args) => event.execute(...args, client));
	}
    log('INFO', 'EVENT_LOADER', `Event ${event.name} berhasil dimuat.`);
}
// --- Akhir Pemuatan Event ---

// ===============================================================================
// == HANDLER INTERAKSI UTAMA ==
// ===============================================================================
client.on('interactionCreate', async interaction => {

    if (interaction.isAutocomplete()) {
        const command = client.commands.get(interaction.commandName);
        if (!command || !command.autocomplete) return;
        try {
            await command.autocomplete(interaction, client);
        } catch (error) {
            log('ERROR', 'AUTOCOMPLETE', `Error pada /${interaction.commandName}: ${error.message}`);
        }
        return;
    }

    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        const logChannelId = client.config.channels.botLogs;
        if (logChannelId) {
            const logChannel = await client.channels.fetch(logChannelId).catch(() => null);
            if (logChannel) {
                const commandLogEmbed = new EmbedBuilder()
                    .setColor(0x0000FF)
                    .setTitle('Command Executed')
                    .setDescription(`**Command:** /${interaction.commandName}\n**User:** ${interaction.user.tag} (ID: ${interaction.user.id})\n**Channel:** ${interaction.channel.name} (ID: ${interaction.channel.id})`)
                    .setTimestamp();
                
                const formattedOptions = formatOptions(interaction.options.data);
                if (formattedOptions) {
                    commandLogEmbed.addFields({ name: 'Options', value: `\n${formattedOptions}\n` });
                }

                await logChannel.send({ embeds: [commandLogEmbed] });
            }
        }

        try {
            await command.execute(interaction, client);
        }
        catch (error) {
            log('ERROR', 'COMMAND_EXEC', `Error menjalankan /${interaction.commandName}: ${error.message}`);
            const errorMsg = { content: '❌ Terjadi kesalahan saat menjalankan perintah ini!', flags: MessageFlags.Ephemeral };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMsg);
            } else {
                await interaction.reply(errorMsg);
            }
        }
        return;
    }

    try {
        if (interaction.isButton()) {
            const customIdParts = interaction.customId.split('_');
            const action = customIdParts[0];
            const MESSAGE_LIFETIME_MS = 60 * 1000; // Define for ephemeral messages

            if (action === 'view') {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                const type = customIdParts[1]; // 'cover' or 'shelf'
                const bookId = customIdParts[2];
                
                const column = type === 'cover' ? 'file_sampul' : 'lokasi_rak';
                const folder = type === 'cover' ? 'sampul' : 'rak';
                const title = type === 'cover' ? 'Sampul Buku' : 'Lokasi Rak';

                const [[book]] = await client.db.query(`SELECT nama_buku, ${column} FROM buku WHERE id_buku = ?`, [bookId]);

                if (!book || !book[column]) {
                    const replyMessage = await interaction.editReply({ content: '❌ Gambar tidak ditemukan.' });
                    await startMessageTimer(replyMessage, client, MESSAGE_LIFETIME_MS);
                    return;
                }

                const imagePath = path.join(__dirname, 'public', folder, book[column]);
                if (!fs.existsSync(imagePath)) {
                    const replyMessage = await interaction.editReply({ content: '❌ File gambar tidak ditemukan di sistem. Hubungi admin.' });
                    await startMessageTimer(replyMessage, client, MESSAGE_LIFETIME_MS);
                    return;
                }

                const embed = new EmbedBuilder()
                    .setTitle(`${title} untuk: ${book.nama_buku}`)
                    .setColor(0x2ECC71)
                    .setImage(`attachment://${book[column]}`);

                const replyMessage = await interaction.editReply({ embeds: [embed], files: [imagePath] });
                await startMessageTimer(replyMessage, client, MESSAGE_LIFETIME_MS);
                return;
            } else if (interaction.customId.startsWith('booklist')) {
                return await handleBooklistPagination(interaction, client);
            } else if (interaction.customId.startsWith('pinjam_')) {
                const command = client.commands.get('pinjam');
                if (command && command.handleButton) {
                    return await command.handleButton(interaction, client);
                }
            } else if (interaction.customId.startsWith('accept_discussion') || interaction.customId.startsWith('decline_discussion')) {
                const command = client.commands.get('diskusi');
                if (command && command.handleButton) {
                    return await command.handleButton(interaction, client);
                }
            } else if (interaction.customId.startsWith('verify_')) {
                const command = client.commands.get('register');
                if (command && command.handleButton) {
                    return await command.handleButton(interaction, client);
                }
            } else { 
                 // Fallback for other button interactions if any
            }

        } else if (interaction.isModalSubmit()) {
            const modalHandlers = {
                'discussion_accept_modal': 'diskusi',
                'register_modal': 'register',
                'login_modal': 'login',
                'lupa_password_modal': 'lupa_password',                
                'pinjam_modal': 'pinjam',
                'manage-ebooks_edit_modal': 'manage-ebooks',
                'rules_update_modal': 'rules'
            };
            for (const [modalId, commandName] of Object.entries(modalHandlers)) {
                if (interaction.customId.startsWith(modalId)) {
                    const command = client.commands.get(commandName);
                    if (command && command.handleModalSubmit) {
                        return await command.handleModalSubmit(interaction, client);
                    }
                }
            }
        } else if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'select_book_to_view') {
                // Batalkan timer penghapusan otomatis pada pesan asli.
                // Ini mencegah pesan detail buku terhapus setelah pengguna membuat pilihan.
                const existingTimer = client.messageTimers.get(interaction.message.id);
                if (existingTimer) {
                    clearTimeout(existingTimer);
                    client.messageTimers.delete(interaction.message.id);
                    log('INFO', 'TIMER_CANCEL', `Timer untuk pesan ${interaction.message.id} dibatalkan karena interaksi pengguna.`);
                }

                await interaction.deferUpdate();
                const bookId = interaction.values[0];
                
                const sqlQuery = `
                    SELECT 
                        b.id_buku, b.nama_buku, b.mata_pelajaran_terkait, 
                        b.stok_tersedia, b.total_stok, b.file_sampul,
                        b.tahun_terbit, b.isbn, b.genre, b.lokasi_rak,
                        COALESCE(SUM(CASE WHEN p.status = 'DIPINJAM' THEN p.jumlah_pinjam ELSE 0 END), 0) AS sedang_dipinjam
                    FROM buku b
                    LEFT JOIN peminjaman p ON b.id_buku = p.id_buku
                    WHERE b.id_buku = ?
                    GROUP BY b.id_buku;
                `;
                const [[book]] = await client.db.query(sqlQuery, [bookId]);

                if (!book) {
                    const replyMessage = await interaction.editReply({ content: '❌ Buku yang dipilih tidak ditemukan lagi.', components: [] });
                    return; 
                }
                
                const cariBukuCommand = client.commands.get('cari_buku');
                if (cariBukuCommand && cariBukuCommand.createBookEmbed) {
                    const replyOptions = cariBukuCommand.createBookEmbed(book);
                    await interaction.editReply(replyOptions);
                    return; 
                }
            } else if (interaction.customId === 'select-ebook-to-read') {
                return await handleSelectEbook(interaction, client);
            } else if (interaction.customId === 'register_role_select') {
                const registerCommand = client.commands.get('register');
                if (registerCommand && registerCommand.handleSelectMenu) {
                    return await registerCommand.handleSelectMenu(interaction, client);
                }
            }
        }
    } catch (error) {
        log('ERROR', 'INTERACTION_HANDLER', `Error pada komponen (${interaction.customId}): ${error.message}\n${error.stack}`);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ Terjadi kesalahan saat merespons interaksi ini!', flags: MessageFlags.Ephemeral });
        } else {
            await interaction.followUp({ content: '❌ Terjadi kesalahan saat merespons interaksi ini!', flags: MessageFlags.Ephemeral });
        }
    }
});

// ===============================================================================
// == FUNGSI-FUNGSI HELPER ==
// ===============================================================================

function formatOptions(optionsArray, prefix = '') {
    if (!optionsArray || optionsArray.length === 0) return '';

    return optionsArray.map(option => {
        let optionString = `${prefix}${option.name}: `;
        if (option.options) {
            optionString += `(Subcommand/Group)\n${formatOptions(option.options, prefix + '  ')}`;
        } else if (option.value !== undefined) {
            optionString += `${option.value}`;
        } else {
            optionString += `(no value)`;
        }
        return optionString;
    }).join('\n');
}

async function handleBooklistPagination(interaction, client) {
    await interaction.deferUpdate();
    try {
        const [_, action, currentPageStr] = interaction.customId.split('_');
        const currentPage = parseInt(currentPageStr, 10);
        let newPage = currentPage;
        if (action === 'next') {
            newPage++;
        } else if (action === 'prev') {
            newPage--;
        }
        const bookListMessage = await generateBookListEmbed(client, newPage);
        await interaction.editReply(bookListMessage);
    } catch (error) {
        log('ERROR', 'BOOKLIST_PAGINATION', `Error handling booklist pagination: ${error.message}`);
    }
}

async function handleSelectEbook(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
        const selectedEbookId = interaction.values[0];
        const db = client.db;
        const [ebooks] = await db.query('SELECT judul, penulis, deskripsi, nama_file, file_sampul FROM ebooks WHERE id = ?', [selectedEbookId]);
        if (ebooks.length === 0) {
            return await interaction.editReply({
                content: '❌ E-book tidak ditemukan lagi di database. Mungkin sudah dihapus.',
                flags: MessageFlags.Ephemeral
            });
        }
        const ebook = ebooks[0];
        const ebookUrl = ebook.nama_file;
        if (!ebookUrl || (!ebookUrl.startsWith('http://') && !ebookUrl.startsWith('https://'))) {
             return await interaction.editReply({
                content: `❌ Link untuk e-book "${ebook.judul}" tidak valid atau rusak. Harap hubungi admin untuk memperbaikinya.`,
                flags: MessageFlags.Ephemeral
            });
        }
        const embed = new EmbedBuilder()
            .setTitle(`📖 ${ebook.judul}`)
            .setAuthor({ name: `Penulis: ${ebook.penulis || 'Tidak diketahui'}` })
            .setDescription(ebook.deskripsi || '_Tidak ada deskripsi._')
            .setColor(0x00BFFF)
            .setTimestamp();
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Baca E-book di Google Drive')
                    .setStyle(ButtonStyle.Link)
                    .setURL(ebookUrl)
                    .setEmoji('🔗')
            );

        const replyOptions = { embeds: [embed], components: [row], flags: MessageFlags.Ephemeral };

        if (ebook.file_sampul) {
            const imagePath = path.join(__dirname, 'public', 'sampul', ebook.file_sampul);
            if (fs.existsSync(imagePath)) {
                embed.setImage(`attachment://${ebook.file_sampul}`);
                replyOptions.files = [imagePath];
            }
        }

        await interaction.editReply(replyOptions);
    } catch (error) {
        log('ERROR', 'SELECT_EBOOK_HANDLER', `Gagal menangani pemilihan e-book: ${error.message}`);
        await interaction.editReply({ content: '❌ Terjadi kesalahan internal saat mencoba mengambil detail e-book.', flags: MessageFlags.Ephemeral });
    }
}

// --- Process Exit Handler ---
process.on('SIGINT', () => {
    log('INFO', 'SYSTEM', 'Bot sedang dimatikan...');
    client.timers.forEach(timer => clearInterval(timer));
    client.timers.clear();
    client.destroy();
    process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
