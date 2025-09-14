const { Events, ChannelType } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
const path = require('path');
const postBookList = require('../utils/postBookList');
const cleanupAndPostStatus = require('../utils/cleanupAndPost');
const { updateLeaderboard } = require('../utils/leaderboardUpdater'); // ✅ Tambah import leaderboard
const { startScheduler } = require('../utils/scheduler');
const { log } = require('../utils/logger');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`[READY] Bot telah online! Login sebagai ${client.user.tag}`);
        client.user.setActivity('Mengelola Buku Perpustakaan', { type: 'WATCHING' });

        // --- Fitur Suara Startup (dengan logging detail) ---
        const voiceChannelId = '1410599781608329264';
        const soundFilePath = path.join(__dirname, '..', 'sounds', 'startup.mp3');
        log('INFO', 'STARTUP_SOUND', `Mencoba memutar suara startup dari: ${soundFilePath}`);

        try {
            const voiceChannel = await client.channels.fetch(voiceChannelId);
            if (voiceChannel && voiceChannel.type === ChannelType.GuildVoice) {
                log('INFO', 'STARTUP_SOUND', `Channel voice ditemukan: ${voiceChannel.name}. Mencoba untuk bergabung...`);
                
                const connection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: voiceChannel.guild.id,
                    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
                    debug: true // Aktifkan logging tambahan
                });

                connection.on(VoiceConnectionStatus.Ready, () => {
                    try {
                        log('INFO', 'STARTUP_SOUND', 'Koneksi voice Siap. Memutar audio...');
                        const player = createAudioPlayer();
                        const resource = createAudioResource(soundFilePath);
                        connection.subscribe(player);
                        player.play(resource);

                        player.on(AudioPlayerStatus.Idle, () => {
                            log('INFO', 'STARTUP_SOUND', 'Audio selesai diputar, koneksi akan dihancurkan.');
                            if (connection.state.status !== VoiceConnectionStatus.Destroyed) {
                                connection.destroy();
                            }
                        });
                         player.on('error', error => {
                            log('ERROR', 'STARTUP_SOUND', `Audio Player Error: ${error.message}`);
                            if (connection.state.status !== VoiceConnectionStatus.Destroyed) {
                                connection.destroy();
                            }
                        });
                    } catch (playerError) {
                        log('ERROR', 'STARTUP_SOUND', `Gagal saat mencoba memutar audio: ${playerError.message}\n${playerError.stack}`);
                        if (connection.state.status !== VoiceConnectionStatus.Destroyed) {
                            connection.destroy();
                        }
                    }
                });

                connection.on(VoiceConnectionStatus.Disconnected, async () => {
                    log('WARN', 'STARTUP_SOUND', 'Koneksi voice terputus. Mencoba menyambung ulang...');
                    try {
                        await Promise.race([
                            entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                            entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
                        ]);
                        // Berhasil menyambung ulang
                    } catch (error) {
                        log('ERROR', 'STARTUP_SOUND', 'Gagal menyambung ulang, koneksi dihancurkan.');
                        if (connection.state.status !== VoiceConnectionStatus.Destroyed) {
                            connection.destroy();
                        }
                    }
                });
                
                connection.on(VoiceConnectionStatus.Destroyed, () => {
                    log('INFO', 'STARTUP_SOUND', 'Koneksi voice telah dihancurkan.');
                });

            } else {
                 log('WARN', 'STARTUP_SOUND', `Voice channel dengan ID ${voiceChannelId} tidak ditemukan atau bukan voice channel.`);
            }
        } catch (err) {
            log('ERROR', 'STARTUP_SOUND', `Gagal pada tahap awal suara startup: ${err.message}\n${err.stack}`);
        }
        // --- Akhir Fitur Suara Startup ---

        // Kirim status peminjaman awal setelah membersihkan channel
        try {
            const statusChannelId = client.config.channels.statusBuku;
            if (statusChannelId) {
                await cleanupAndPostStatus(client, statusChannelId);
            } else {
                log('WARN', 'READY', 'ID Channel status buku tidak ditemukan, melewati posting status awal.');
            }
        } catch (err) {
            log('ERROR', 'READY', `Gagal menjalankan proses posting status awal: ${err.message}`);
        }

        // Kirim daftar buku ke channel daftar buku
        try {
            const booklistChannelId = client.config.channels.daftarBuku; // Pastikan ID ini ada di config.json
            if (!booklistChannelId) {
                return console.log('[BOOKLIST] ID Channel daftar buku tidak ditemukan di config.json.');
            }
            
            const channel = await client.channels.fetch(booklistChannelId);
            if (channel) {
                const bookListMessage = await postBookList(client, 1);
                await channel.send(bookListMessage);
                console.log('[BOOKLIST] Daftar buku berhasil dikirim ke channel.');
            } else {
                console.log(`[BOOKLIST] Channel daftar buku dengan ID ${booklistChannelId} tidak ditemukan.`);
            }
        } catch (err) {
            console.error('[BOOKLIST] Gagal mengirim daftar buku:', err);
        }

        // --- Leaderboard Auto Refresh on Startup ---
        try {
            await updateLeaderboard(client);
            log('INFO', 'READY', 'Leaderboard peminjaman buku berhasil diperbarui saat startup.');
        } catch (err) {
            log('ERROR', 'READY', `Gagal memperbarui leaderboard saat startup: ${err.message}`);
        }

        // --- Jalankan Scheduler Pengecekan Keterlambatan ---
        startScheduler(client);
    },
}