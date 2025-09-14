/*
================================================================================
File: 📁 smanung-library-bot/commands/perpus/pinjam.js
Tujuan: Perintah untuk siswa/guru mengajukan peminjaman buku untuk kelas, dengan alur persetujuan admin via modal.
================================================================================
*/
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const db = require('../../utils/db');
const { log } = require('../../utils/logger');
const cleanupAndPostStatus = require('../../utils/cleanupAndPost');
const { handleInteractionError } = require('../../utils/errorHandler'); // ✅ Tambah helper

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pinjam')
        .setDescription('Mengajukan permintaan untuk meminjam buku dari perpustakaan.')
        .addStringOption(option =>
            option.setName('kelas')
                .setDescription('Pilih kelas yang akan meminjam buku ini.')
                .setRequired(true)
                .setAutocomplete(true))
        .addStringOption(option =>
            option.setName('buku')
                .setDescription('Pilih buku (akan terfilter oleh kelas yang dipilih).')
                .setRequired(true)
                .setAutocomplete(true))
        .addStringOption(option =>
            option.setName('mata_pelajaran')
                .setDescription('Filter buku berdasarkan mata pelajaran & guru (opsional).')
                .setRequired(false)
                .setAutocomplete(true)),
 
    async autocomplete(interaction, client) {
        const focusedOption = interaction.options.getFocused(true);
        let choices = [];
 
        try {
            if (focusedOption.name === 'mata_pelajaran') {
                const focusedValue = focusedOption.value;
                const query = 'SELECT DISTINCT mata_pelajaran, nama_guru FROM jadwal WHERE (mata_pelajaran LIKE ? OR nama_guru LIKE ?) AND nama_guru IS NOT NULL AND nama_guru != "" ORDER BY mata_pelajaran, nama_guru ASC LIMIT 25';
                const [rows] = await db.query(query, [`%${focusedValue}%`, `%${focusedValue}%`]);
                choices = rows.map(row => ({
                    name: `${row.mata_pelajaran} (Guru: ${row.nama_guru})`,
                    value: `${row.mata_pelajaran}:${row.nama_guru}`
                }));
            } else if (focusedOption.name === 'buku') {
                const focusedValue = focusedOption.value;
                const kelasId = interaction.options.getString('kelas');
                const mapelAndGuru = interaction.options.getString('mata_pelajaran');
                const mapelFilter = mapelAndGuru ? mapelAndGuru.split(':')[0] : null;

                let query = 'SELECT id_buku, nama_buku, stok_tersedia FROM buku WHERE nama_buku LIKE ? AND stok_tersedia > 0';
                const queryParams = [`%${focusedValue}%`];

                if (kelasId) {
                    try {
                        const [[kelasData]] = await db.query('SELECT nama_kelas FROM kelas WHERE id_kelas = ?', [kelasId]);
                        if (kelasData) {
                            const tingkatKelas = kelasData.nama_kelas.split('.')[0].toUpperCase(); // X, XI, XII
                            query += ` AND tingkat_kelas = ?`;
                            queryParams.push(tingkatKelas);
                        }
                    } catch (e) {
                        log('DEBUG', 'AUTOCOMPLETE_PINJAM', 'Could not fetch class data for filtering, showing unfiltered books.');
                    }
                }

                if (mapelFilter) {
                    query += ' AND mata_pelajaran_terkait = ?';
                    queryParams.push(mapelFilter);
                }
 
                query += ' ORDER BY nama_buku ASC LIMIT 25';
 
                const [rows] = await db.query(query, queryParams);
                choices = rows.map(row => ({
                    name: `${row.nama_buku} (Stok: ${row.stok_tersedia})`,
                    value: row.id_buku.toString()
                }));
            } else if (focusedOption.name === 'kelas') {
                const focusedValue = focusedOption.value;
                const query = `
                    SELECT id_kelas, nama_kelas
                    FROM kelas
                    WHERE nama_kelas LIKE ?
                    ORDER BY
                      CASE
                        WHEN nama_kelas LIKE 'X.%' THEN 1
                        WHEN nama_kelas LIKE 'XI.%' THEN 2
                        WHEN nama_kelas LIKE 'XII.%' THEN 3
                        ELSE 4
                      END,
                      CAST(SUBSTRING_INDEX(nama_kelas, 'F', -1) AS UNSIGNED)
                    LIMIT 25
                `;
                const [rows] = await db.query(query, [`%${focusedValue}%`]);
                choices = rows.map(row => ({ name: row.nama_kelas, value: row.id_kelas.toString() }));
            }
            await interaction.respond(choices);
        } catch (error) {
            log('ERROR', 'AUTOCOMPLETE_PINJAM', `Error on ${focusedOption.name}: ${error.message}`);
            await interaction.respond([]);
        }
    },
 
    async execute(interaction, client) {
        // await interaction.deferReply({ flags: MessageFlags.Ephemeral }); // ✅ Tambah di awal - REMOVED

        const member = interaction.member;
        const siswaRoleId = '1410599779469234263';
        const guruRoleId = '1410599779469234262';
 
        if (!member.roles.cache.has(siswaRoleId) && !member.roles.cache.has(guruRoleId)) {
            return interaction.reply({
                content: '❌ Perintah ini hanya dapat digunakan oleh Siswa dan Guru yang sudah terverifikasi.',
                flags: MessageFlags.Ephemeral
            });
        }
 
        let penanggungJawabDefault = interaction.user.username;
        try {
            const [[userRecord]] = await client.db.query('SELECT nama_lengkap FROM pengguna WHERE discord_id = ?', [interaction.user.id]);
            if (userRecord && userRecord.nama_lengkap) {
                penanggungJawabDefault = userRecord.nama_lengkap;
            }
        } catch (dbError) {
            log('WARN', 'PINJAM_FETCH_NAME', `Tidak dapat mengambil nama lengkap untuk ${interaction.user.tag}. Menggunakan username sebagai fallback. Error: ${dbError.message}`);
        }

        const bookId = interaction.options.getString('buku');
        const kelasId = interaction.options.getString('kelas');
        const mapelAndGuru = interaction.options.getString('mata_pelajaran') || ':';
 
        const customIdData = `${bookId}|${kelasId}|${Buffer.from(mapelAndGuru).toString('base64url')}`;
 
        const modal = new ModalBuilder()
            .setCustomId(`pinjam_modal_${customIdData}`)
            .setTitle('Formulir Peminjaman Buku');
 
        const jumlahInput = new TextInputBuilder()
            .setCustomId('jumlah_pinjam')
            .setLabel("Jumlah Buku yang Dipinjam")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Contoh: 5')
            .setRequired(true);
 
        const penanggungJawabInput = new TextInputBuilder()
            .setCustomId('penanggung_jawab')
            .setLabel("Nama Penanggung Jawab")
            .setStyle(TextInputStyle.Short)
            .setValue(penanggungJawabDefault)
            .setRequired(true);

        const durasiInput = new TextInputBuilder()
            .setCustomId('durasi_pinjam')
            .setLabel("Durasi Peminjaman (menit)")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Contoh: 60 (untuk 1 jam)')
            .setRequired(true);
 
        modal.addComponents(
            new ActionRowBuilder().addComponents(jumlahInput),
            new ActionRowBuilder().addComponents(penanggungJawabInput),
            new ActionRowBuilder().addComponents(durasiInput)
        );
 
        await interaction.showModal(modal);
    },
 
    async handleModalSubmit(interaction, client) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
 
        const customIdParts = interaction.customId.split('_')[2].split('|');
        const bookId = customIdParts[0];
        const kelasId = customIdParts[1];
        const mapelAndGuru = Buffer.from(customIdParts[2], 'base64url').toString('utf-8');
        const [mapel, guru] = mapelAndGuru.split(':');
 
        const jumlahPinjamStr = interaction.fields.getTextInputValue('jumlah_pinjam');
        const penanggungJawab = interaction.fields.getTextInputValue('penanggung_jawab');
        const durasiPinjamStr = interaction.fields.getTextInputValue('durasi_pinjam');
 
        const jumlahPinjam = parseInt(jumlahPinjamStr, 10);
        if (isNaN(jumlahPinjam) || jumlahPinjam <= 0) {
            return interaction.editReply({ content: '❌ Jumlah pinjam harus berupa angka positif.' });
        }

        const durasiPinjam = parseInt(durasiPinjamStr, 10);
        if (isNaN(durasiPinjam) || durasiPinjam <= 0) {
            return interaction.editReply({ content: '❌ Durasi pinjam harus berupa angka menit positif.' });
        }
 
        try {
            const [[book]] = await db.query('SELECT * FROM buku WHERE id_buku = ?', [bookId]);
            const [[kelas]] = await db.query('SELECT nama_kelas FROM kelas WHERE id_kelas = ?', [kelasId]);
 
            if (!book) return interaction.editReply({ content: '❌ Buku tidak ditemukan.' });
            if (!kelas) return interaction.editReply({ content: '❌ Kelas yang dipilih tidak valid.' });
            if (book.stok_tersedia < jumlahPinjam) {
                return interaction.editReply({ content: `❌ Stok untuk buku "${book.nama_buku}" tidak mencukupi. Stok tersedia: ${book.stok_tersedia}.` });
            }
 
            const adminChannelId = client.config.channels.laporanHarian;
            const adminChannel = await client.channels.fetch(adminChannelId).catch(() => null);
 
            if (!adminChannel) {
                log('ERROR', 'PINJAM_REQUEST', `Channel laporan harian (untuk admin) dengan ID ${adminChannelId} tidak ditemukan.`);
                return interaction.editReply({ content: '❌ Gagal mengirim permintaan ke admin. Channel tidak ditemukan.' });
            }
 
            const requestEmbed = new EmbedBuilder()
                .setColor('Yellow')
                .setTitle('🔔 Permintaan Peminjaman Buku Baru')
                .setDescription(`Admin perpustakaan, ada permintaan peminjaman buku baru yang perlu persetujuan Anda.`)
                .addFields(
                    { name: 'Pemohon', value: `${interaction.user.tag} (${interaction.user.id})`, inline: false },
                    { name: 'Penanggung Jawab', value: penanggungJawab, inline: false },
                    { name: 'Buku', value: `${book.nama_buku} (ID: ${book.id_buku})`, inline: false },
                    { name: 'Untuk Kelas', value: kelas.nama_kelas, inline: false },
                    { name: 'Guru Pengajar', value: guru || 'Tidak ditentukan', inline: false },
                    { name: 'Jumlah', value: `${jumlahPinjam} eksemplar`, inline: true },
                    { name: 'Durasi', value: `${durasiPinjam} menit`, inline: true },
                    { name: 'Status', value: 'Menunggu Persetujuan', inline: true }
                )
                .setTimestamp()
                .setThumbnail(interaction.user.displayAvatarURL());
 
            const buttonCustomIdData = `${book.id_buku}_${interaction.user.id}_${jumlahPinjam}_${durasiPinjam}_${kelasId}_${Buffer.from(penanggungJawab).toString('base64url')}_${Buffer.from(guru || '').toString('base64url')}`;
 
            const actionRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`pinjam_terima_${buttonCustomIdData}`)
                        .setLabel('Terima')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('✅'),
                    new ButtonBuilder()
                        .setCustomId(`pinjam_tolak_${buttonCustomIdData}`)
                        .setLabel('Tolak')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('❌')
                );
 
            await adminChannel.send({ embeds: [requestEmbed], components: [actionRow] });
 
            await interaction.editReply({ content: '✅ Permintaan peminjaman Anda telah berhasil dikirim ke admin perpustakaan untuk persetujuan.' });
            log('INFO', 'PINJAM_REQUEST', `Permintaan pinjam dari ${interaction.user.tag} untuk buku '${book.nama_buku}' (x${jumlahPinjam}) untuk kelas ${kelas.nama_kelas} telah dikirim.`);
 
        } catch (error) {
            log('ERROR', 'PINJAM_EXECUTE', `Error saat ${interaction.user.tag} mengajukan pinjaman: ${error.message}`);
            await handleInteractionError(interaction);
        }
    },
 
    async handleButton(interaction, client) {
        if (!interaction.member.roles.cache.has(client.config.roles.adminPerpus)) {
            return interaction.reply({ content: '❌ Hanya Admin Perpustakaan yang dapat merespons permintaan ini.', flags: MessageFlags.Ephemeral });
        }

        await interaction.deferUpdate();

        try {
            const [_, action, bookId, userId, jumlah, durasi, kelasId, penanggungJawabB64, guruB64] = interaction.customId.split('_');
            const penanggungJawab = Buffer.from(penanggungJawabB64, 'base64url').toString('utf-8');
            const guru = Buffer.from(guruB64, 'base64url').toString('utf-8');
            const jumlahPinjam = parseInt(jumlah, 10);
            const durasiPinjam = parseInt(durasi, 10);

            const originalMessage = interaction.message;
            const originalEmbed = EmbedBuilder.from(originalMessage.embeds[0]);
            const disabledButtons = ActionRowBuilder.from(originalMessage.components[0]);
            disabledButtons.components.forEach(comp => comp.setDisabled(true));

            const targetMember = await interaction.guild.members.fetch(userId).catch(() => null);
            if (!targetMember) {
                originalEmbed.setColor('DarkRed').spliceFields(7, 1, { name: 'Status', value: 'Gagal: User tidak ditemukan', inline: true });
                return await interaction.editReply({ embeds: [originalEmbed], components: [disabledButtons] });
            }

            const [[book]] = await db.query('SELECT nama_buku, stok_tersedia FROM buku WHERE id_buku = ?', [bookId]);
            if (!book) {
                originalEmbed.setColor('DarkRed').spliceFields(7, 1, { name: 'Status', value: 'Gagal: Buku tidak ditemukan', inline: true });
                return await interaction.editReply({ embeds: [originalEmbed], components: [disabledButtons] });
            }

            if (action === 'terima') {
                if (book.stok_tersedia < jumlahPinjam) {
                    originalEmbed.setColor('Red').spliceFields(7, 1, { name: 'Status', value: `Ditolak Otomatis (Stok Habis)`, inline: true }).addFields({ name: 'Penyebab', value: `Stok tidak mencukupi. Sisa: ${book.stok_tersedia}.` });
                    await interaction.editReply({ embeds: [originalEmbed], components: [disabledButtons] });
                    try { await targetMember.send(`Maaf, permintaan peminjaman buku **"${book.nama_buku}"** Anda tidak dapat disetujui karena stok sudah habis saat admin akan memprosesnya.`); } catch (e) { log('WARN', 'PINJAM_DM', `Gagal mengirim DM penolakan otomatis ke ${targetMember.user.tag}`); }
                    return;
                }
                try {
                    const adminDiscordId = interaction.user.id;
                    const [[adminRecord]] = await db.query('SELECT id_admin FROM admin WHERE discord_id = ?', [adminDiscordId]);
                    const adminIdFk = adminRecord ? adminRecord.id_admin : null;

                    await db.query('UPDATE buku SET stok_tersedia = stok_tersedia - ? WHERE id_buku = ?', [jumlahPinjam, bookId]);
                    await db.query(
                        'INSERT INTO peminjaman (id_buku, id_kelas, id_admin, jumlah_pinjam, penanggung_jawab, nama_guru_pengajar, timestamp_pinjam, durasi_pinjam, status) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, "DIPINJAM")',
                        [bookId, kelasId, adminIdFk, jumlahPinjam, penanggungJawab, guru, durasiPinjam]
                    );

                    const [insertResult] = await db.query('SELECT LAST_INSERT_ID() as id');
                    const newLoanId = insertResult[0].id;

                    // Get complete loan data for monitoring
                    const [[newLoanData]] = await db.query(`
                        SELECT 
                            p.id_peminjaman,
                            p.timestamp_pinjam,
                            p.durasi_pinjam,
                            p.penanggung_jawab,
                            p.denda,
                            b.nama_buku,
                            k.nama_kelas,
                            pen.discord_id
                        FROM peminjaman p
                        JOIN buku b ON p.id_buku = b.id_buku
                        JOIN kelas k ON p.id_kelas = k.id_kelas
                        LEFT JOIN pengguna pen ON p.penanggung_jawab = pen.nama_lengkap
                        WHERE p.id_peminjaman = ?
                    `, [newLoanId]);

                    // Start monitoring this loan
                    if (client.overdueMonitor && newLoanData) {
                        client.overdueMonitor.handleNewLoan(newLoanData);
                    }

                    originalEmbed.setColor('Green').spliceFields(7, 1, { name: 'Status', value: `Disetujui oleh ${interaction.user.tag}`, inline: true });
                    await interaction.editReply({ embeds: [originalEmbed], components: [disabledButtons] });
                    try { await targetMember.send(`Kabar baik! Permintaan peminjaman buku **"${book.nama_buku}"** (x${jumlahPinjam}) Anda telah **disetujui** oleh admin. Jangan lupa untuk mengembalikannya tepat waktu ya!`); } catch (e) { log('WARN', 'PINJAM_DM', `Gagal mengirim DM persetujuan ke ${targetMember.user.tag}`); }
                    log('INFO', 'PINJAM_APPROVE', `Pinjaman buku '${book.nama_buku}' untuk kelas ID ${kelasId} (penanggung: ${penanggungJawab}) disetujui oleh ${interaction.user.tag}.`);
                    await cleanupAndPostStatus(client, client.config.channels.statusBuku);
                } catch (error) {
                    log('ERROR', 'PINJAM_APPROVE_DB', `Error DB saat menyetujui pinjaman: ${error.message}`);
                    await handleInteractionError(interaction);
                    originalEmbed.setColor('DarkRed').spliceFields(7, 1, { name: 'Status', value: 'Gagal: Database Error', inline: true });
                    await interaction.editReply({ embeds: [originalEmbed], components: [disabledButtons] });
                }
            } else if (action === 'tolak') {
                originalEmbed.setColor('Red').spliceFields(7, 1, { name: 'Status', value: `Ditolak oleh ${interaction.user.tag}`, inline: true });
                await interaction.editReply({ embeds: [originalEmbed], components: [disabledButtons] });
                try { await targetMember.send(`Maaf, permintaan peminjaman buku **"${book.nama_buku}"** Anda telah **ditolak** oleh admin.`); } catch (e) { log('WARN', 'PINJAM_DM', `Gagal mengirim DM penolakan ke ${targetMember.user.tag}`); }
                log('INFO', 'PINJAM_REJECT', `Pinjaman buku '${book.nama_buku}' untuk kelas ID ${kelasId} (penanggung: ${penanggungJawab}) ditolak oleh ${interaction.user.tag}.`);
            }
        } catch (error) {
            log('ERROR', 'PINJAM_BUTTON', error.message);
            await handleInteractionError(interaction);
        }
    },
};