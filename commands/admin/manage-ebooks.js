/*
================================================================================
File: 📁 smanung-library-bot/commands/admin/manage-ebooks.js
Tujuan: Perintah untuk admin mengelola e-book (list, edit, delete).
================================================================================
*/
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

const ITEMS_PER_PAGE = 10; // Jumlah e-book per halaman

module.exports = {
    data: new SlashCommandBuilder()
        .setName('manage-ebooks')
        .setDescription('Mengelola e-book di database (list, edit, delete).')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild) // Hanya untuk admin server
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Menampilkan daftar semua e-book.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setDescription('Mengedit detail e-book berdasarkan ID.')
                .addIntegerOption(option =>
                    option.setName('id')
                        .setDescription('Ketik judul e-book untuk mencari ID-nya secara otomatis.')
                        .setAutocomplete(true) // Mengaktifkan rekomendasi
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Menghapus e-book berdasarkan ID.')
                .addIntegerOption(option =>
                    option.setName('id')
                        .setDescription('Ketik judul e-book untuk mencari ID-nya secara otomatis.')
                        .setAutocomplete(true) // Mengaktifkan rekomendasi
                        .setRequired(true))),

    async autocomplete(interaction, client) {
        const focusedOption = interaction.options.getFocused(true);
        
        // Pastikan autocomplete hanya berjalan untuk opsi 'id'
        if (focusedOption.name === 'id') {
            const focusedValue = focusedOption.value;
            const db = client.db;

            // Jangan berikan saran jika input kosong
            if (!focusedValue) {
                return await interaction.respond([]);
            }

            try {
                // Cari e-book berdasarkan judul ATAU ID yang cocok dengan input
                const query = `
                    SELECT id, judul 
                    FROM ebooks 
                    WHERE judul LIKE ? OR id LIKE ?
                    ORDER BY id DESC 
                    LIMIT 25
                `; // Discord hanya memperbolehkan maksimal 25 saran
                const [results] = await db.query(query, [`%${focusedValue}%`, `%${focusedValue}%`]);

                // Format hasil untuk ditampilkan sebagai pilihan autocomplete
                const choices = results.map(ebook => ({
                    name: `(ID: ${ebook.id}) ${ebook.judul.substring(0, 80)}`, // Tampilkan ID dan Judul (dipotong jika terlalu panjang)
                    value: ebook.id // Kirim ID (number) saat opsi ini dipilih
                }));

                await interaction.respond(choices);
            } catch (error) {
                console.error('[AUTOCOMPLETE ERROR] /manage-ebooks id:', error);
                await interaction.respond([]); // Kirim array kosong jika terjadi error
            }
        }
    },

    async execute(interaction, client) {
        // Cek izin khusus role adminPerpus
        if (!interaction.member.roles.cache.has(client.config.roles.adminPerpus)) {
            return interaction.reply({ content: '❌ Anda tidak memiliki izin untuk menggunakan perintah ini.', ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'list') {
            await handleListEbooks(interaction, client, 0); // Start with page 0
        } else if (subcommand === 'edit') {
            await handleEditEbook(interaction, client);
        } else if (subcommand === 'delete') {
            await handleDeleteEbook(interaction, client);
        }
    },

    // --- Handlers for interactions (called from index.js) ---
    async handleButton(interaction, client) {
        // Custom IDs are like:
        // manage-ebooks_next_1
        // manage-ebooks_prev_1
        // manage-ebooks_delete_confirm_123
        // manage-ebooks_delete_cancel_123
        const parts = interaction.customId.split('_');
        const action = parts[1]; // 'next', 'prev', or 'delete'

        if (action === 'next' || action === 'prev') {
            return await this.handleListPagination(interaction, client);
        } else if (action === 'delete') {
            return await this.handleDeleteConfirmation(interaction, client);
        }
    },
    async handleListPagination(interaction, client) {
        await interaction.deferUpdate();
        const [, action, currentPageStr] = interaction.customId.split('_');
        let currentPage = parseInt(currentPageStr, 10);

        if (action === 'next') {
            currentPage++;
        } else if (action === 'prev') {
            currentPage--;
        }
        await handleListEbooks(interaction, client, currentPage);
    },

    async handleModalSubmit(interaction, client) {
        await interaction.deferReply({ ephemeral: true });
        const ebookId = interaction.customId.split('_')[3]; // Corrected index to get the ID
        const judul = interaction.fields.getTextInputValue('edit_judul');
        const penulis = interaction.fields.getTextInputValue('edit_penulis');
        const deskripsi = interaction.fields.getTextInputValue('edit_deskripsi');
        const pdfUrl = interaction.fields.getTextInputValue('edit_pdf_url');

        try {
            // Basic URL validation
            try {
                new URL(pdfUrl);
            } catch (e) {
                return interaction.editReply({ content: '❌ URL PDF tidak valid.' });
            }

            const query = 'UPDATE ebooks SET judul = ?, penulis = ?, deskripsi = ?, nama_file = ? WHERE id = ?';
            const [result] = await client.db.query(query, [judul, penulis, deskripsi, pdfUrl, ebookId]);

            if (result.affectedRows > 0) {
                const embed = new EmbedBuilder()
                    .setColor('Green')
                    .setTitle('✅ E-book Berhasil Diperbarui')
                    .setDescription(`E-book dengan ID **${ebookId}** telah berhasil diperbarui.`);
                await interaction.editReply({ embeds: [embed] });
            } else {
                await interaction.editReply({ content: `❌ Gagal memperbarui e-book dengan ID **${ebookId}**. Mungkin ID tidak ditemukan.` });
            }
        } catch (error) {
            console.error('Error saat memperbarui e-book:', error);
            await interaction.editReply({ content: '❌ Terjadi kesalahan saat memperbarui e-book di database.' });
        }
    },

    async handleDeleteConfirmation(interaction, client) {
        await interaction.deferUpdate();
        const parts = interaction.customId.split('_');
        const action = parts[2]; // 'confirm' or 'cancel'
        const ebookId = parts[3]; // The actual ebook ID

        if (action === 'confirm') {
            try {
                const query = 'DELETE FROM ebooks WHERE id = ?';
                const [result] = await client.db.query(query, [ebookId]);

                if (result.affectedRows > 0) {
                    const successEmbed = new EmbedBuilder()
                        .setColor('Green')
                        .setTitle('✅ Penghapusan Berhasil')
                        .setDescription(`E-book dengan ID **${ebookId}** telah berhasil dihapus.`)
                        .setTimestamp();
                    await interaction.editReply({ embeds: [successEmbed], components: [] });
                } else {
                     const notFoundEmbed = new EmbedBuilder()
                        .setColor('Red')
                        .setTitle('❌ Gagal Hapus')
                        .setDescription(`Gagal menghapus e-book dengan ID **${ebookId}**. Mungkin ID tidak ditemukan atau sudah dihapus.`)
                        .setTimestamp();
                    await interaction.editReply({ embeds: [notFoundEmbed], components: [] });
                }
            } catch (error) {
                console.error(`[MANAGE EBOOK DELETE] Terjadi kesalahan saat mencoba menghapus e-book dengan ID: ${ebookId}.`, error);
                const errorEmbed = new EmbedBuilder()
                    .setColor('Red')
                    .setTitle('❌ Terjadi Error Internal')
                    .setDescription('Terjadi kesalahan saat menghapus e-book dari database. Silakan cek log konsol untuk detailnya.')
                    .setTimestamp();
                await interaction.editReply({ embeds: [errorEmbed], components: [] });
            }
        } else if (action === 'cancel') {
            const cancelEmbed = new EmbedBuilder()
                .setColor('Greyple')
                .setTitle('⚪️ Dibatalkan')
                .setDescription(`Tindakan penghapusan untuk e-book dengan ID **${ebookId}** telah dibatalkan.`)
                .setTimestamp();
            await interaction.editReply({ embeds: [cancelEmbed], components: [] });
        }
    }
};

// --- Helper Functions ---
async function handleListEbooks(interaction, client, page) {
    // Defer reply only for the initial command, not for button clicks
    if (interaction.isCommand()) {
        await interaction.deferReply({ ephemeral: true });
    }
/*
// --- Helper Functions ---
async function handleListEbooks(interaction, client, page) {
    // Defer reply based on interaction type
    if (interaction.isCommand()) {
        await interaction.deferReply({ ephemeral: true });
    } else if (interaction.isButton()) {
        await interaction.deferUpdate();
    }
*/
    const db = client.db;
    const EBOOK_CHANNEL_ID = '1410599781038030933'; //

    try {
        const offset = page * ITEMS_PER_PAGE;
        const [countResult] = await db.query('SELECT COUNT(*) AS total FROM ebooks');
        const totalEbooks = countResult[0].total;
        const totalPages = Math.ceil(totalEbooks / ITEMS_PER_PAGE);

        const channel = await client.channels.fetch(EBOOK_CHANNEL_ID).catch(() => null);

        // Handle case where there are no ebooks
        if (totalEbooks === 0) {
            if (channel) {
                try {
                    const messages = await channel.messages.fetch({ limit: 50 });
                    const botMessage = messages.find(m => m.author.id === client.user.id && m.embeds[0]?.title === '📚 Daftar E-book Perpustakaan');
                    if (botMessage) await botMessage.delete();
                } catch (e) {
                    console.error(`[WARN] Gagal menghapus pesan lama di channel e-book:`, e.message);
                }
            }
            if (interaction.isCommand()) {
                return interaction.editReply({ content: 'Tidak ada e-book di database. Pesan di channel publik (jika ada) telah dihapus.' });
            }
            return;
        }
        
        const query = `SELECT id, judul, penulis FROM ebooks ORDER BY judul ASC LIMIT ? OFFSET ?`;
        const [results] = await db.query(query, [ITEMS_PER_PAGE, offset]);

        const embed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle('📚 Daftar E-book Perpustakaan')
            .setDescription(`Berikut adalah daftar e-book yang tersedia. Gunakan tombol di bawah untuk navigasi halaman.\n\n**Halaman ${page + 1} dari ${totalPages} (Total: ${totalEbooks} e-book)**`)
            .setTimestamp()
            .setFooter({ text: 'Gunakan /baca-ebook mencari dan membaca e-book.' });

        results.forEach(ebook => {
            embed.addFields({
                name: `ID: ${ebook.id} - ${ebook.judul}`,
                value: `*Penulis: ${ebook.penulis || 'N/A'}*`,
                inline: false,
            });
        });

        const row = new ActionRowBuilder();
        if (page > 0) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`manage-ebooks_prev_${page}`)
                    .setLabel('◀️ Sebelumnya')
                    .setStyle(ButtonStyle.Primary)
            );
        }
        if (page < totalPages - 1) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`manage-ebooks_next_${page}`)
                    .setLabel('Selanjutnya ▶️')
                    .setStyle(ButtonStyle.Primary)
            );
        }
        
        const messagePayload = { embeds: [embed], components: row.components.length > 0 ? [row] : [] };

        // Send or update the list in the public channel
        if (channel) {
            try {
                const messages = await channel.messages.fetch({ limit: 50 });
                const botMessage = messages.find(m => m.author.id === client.user.id && m.embeds[0]?.title === '📚 Daftar E-book Perpustakaan');

                if (botMessage) {
                    await botMessage.edit(messagePayload);
                } else {
                    await channel.send(messagePayload);
                }
                
                if (interaction.isCommand()) {
                     await interaction.editReply({ content: `✅ Daftar e-book berhasil dikirim dan diperbarui di channel ${channel}.` });
                }
            } catch (channelError) {
                console.error(`[ERROR] Gagal mengirim/mengedit daftar e-book di channel ${EBOOK_CHANNEL_ID}:`, channelError);
                if (interaction.isCommand()) {
                    await interaction.editReply({ content: `❌ Gagal mengirim daftar e-book ke channel publik. Silakan cek log dan izin bot.`});
                }
            }
        } else {
            console.error(`[ERROR] Channel dengan ID ${EBOOK_CHANNEL_ID} tidak ditemukan.`);
            if (interaction.isCommand()) {
                await interaction.editReply({ content: `❌ Channel e-book tidak ditemukan. Daftar hanya akan ditampilkan di sini.`, ...messagePayload });
            }
        }

    } catch (dbError) {
        console.error('Error saat menampilkan daftar e-book:', dbError);
        if (interaction.isCommand() && !interaction.replied) {
            await interaction.editReply({ content: '❌ Terjadi kesalahan saat mengambil daftar e-book dari database.' });
        }
    }
}

async function handleEditEbook(interaction, client) {
    const ebookId = interaction.options.getInteger('id');
    const db = client.db;

    try {
        const [results] = await db.query('SELECT judul, penulis, deskripsi, nama_file FROM ebooks WHERE id = ?', [ebookId]);

        if (results.length === 0) {
            return interaction.reply({ content: `❌ E-book dengan ID **${ebookId}** tidak ditemukan.`, ephemeral: true });
        }

        const ebook = results[0];

        const modal = new ModalBuilder()
            .setCustomId(`manage-ebooks_edit_modal_${ebookId}`)
            .setTitle(`Edit E-book ID: ${ebookId}`);

        const judulInput = new TextInputBuilder()
            .setCustomId('edit_judul')
            .setLabel('Judul E-book')
            .setStyle(TextInputStyle.Short)
            .setValue(ebook.judul)
            .setRequired(true);

        const penulisInput = new TextInputBuilder()
            .setCustomId('edit_penulis')
            .setLabel('Penulis')
            .setStyle(TextInputStyle.Short)
            .setValue(ebook.penulis || '')
            .setRequired(false);

        const deskripsiInput = new TextInputBuilder()
            .setCustomId('edit_deskripsi')
            .setLabel('Deskripsi')
            .setStyle(TextInputStyle.Paragraph)
            .setValue(ebook.deskripsi || '')
            .setRequired(false);

        const pdfUrlInput = new TextInputBuilder()
            .setCustomId('edit_pdf_url')
            .setLabel('URL PDF')
            .setStyle(TextInputStyle.Short)
            .setValue(ebook.nama_file)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(judulInput),
            new ActionRowBuilder().addComponents(penulisInput),
            new ActionRowBuilder().addComponents(deskripsiInput),
            new ActionRowBuilder().addComponents(pdfUrlInput)
        );

        await interaction.showModal(modal);

    } catch (error) {
        console.error('Error saat menyiapkan modal edit e-book:', error);
        await interaction.reply({ content: '❌ Terjadi kesalahan saat menyiapkan form edit.', ephemeral: true });
    }
}

async function handleDeleteEbook(interaction, client) {
    const ebookId = interaction.options.getInteger('id');

    const embed = new EmbedBuilder()
        .setColor('Red')
        .setTitle('⚠️ Konfirmasi Penghapusan E-book')
        .setDescription(`Anda yakin ingin menghapus e-book dengan ID **${ebookId}**? Tindakan ini tidak dapat dibatalkan.`);

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`manage-ebooks_delete_confirm_${ebookId}`)
                .setLabel('Ya, Hapus')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`manage-ebooks_delete_cancel_${ebookId}`)
                .setLabel('Batal')
                .setStyle(ButtonStyle.Secondary)
        );
    
    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}