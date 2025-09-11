const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const BUKU_PER_HALAMAN = 10; // Atur jumlah buku yang ingin ditampilkan per halaman

async function generateBookListEmbed(client, page) {
    // 1. Ambil total jumlah buku untuk perhitungan halaman
    const [[{ total_buku }]] = await client.db.query('SELECT COUNT(*) as total_buku FROM buku');
    const totalHalaman = Math.ceil(total_buku / BUKU_PER_HALAMAN);
    
    // Pastikan halaman tidak kurang dari 1 atau lebih dari total halaman
    const currentPage = Math.max(1, Math.min(page, totalHalaman));
    
    // 2. Hitung offset untuk query database
    const offset = (currentPage - 1) * BUKU_PER_HALAMAN;

    // 3. Ambil data buku untuk halaman saat ini
    const [rows] = await client.db.query(
        `SELECT nama_buku, mata_pelajaran_terkait, stok_tersedia, total_stok 
         FROM buku ORDER BY nama_buku ASC LIMIT ? OFFSET ?`,
        [BUKU_PER_HALAMAN, offset]
    );

    // 4. Buat deskripsi embed dari daftar buku
    const deskripsi = rows.map((buku, index) => {
        const globalIndex = offset + index + 1;
        return `**${globalIndex}. ${buku.nama_buku}**\n` +
               `> **Mapel:** ${buku.mata_pelajaran_terkait || 'Umum'}\n` +
               `> **Stok:** \`${buku.stok_tersedia} / ${buku.total_stok}\``;
    }).join('\n\n') || '_Tidak ada buku di halaman ini._';

    // 5. Buat Embed
    const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('📚 Daftar Buku Perpustakaan SMAN Unggulan')
        .setDescription(deskripsi)
        .setFooter({ text: `Halaman ${currentPage} dari ${totalHalaman}` })
        .setTimestamp();

    // 6. Buat Tombol Navigasi
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`booklist_prev_${currentPage}`)
                .setLabel('◀️ Sebelumnya')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage === 1),
            new ButtonBuilder()
                .setCustomId(`booklist_next_${currentPage}`)
                .setLabel('Selanjutnya ▶️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage === totalHalaman || total_buku === 0),
        );
        
    return { embeds: [embed], components: [row], ephemeral: false };
}

module.exports = generateBookListEmbed;




/*const { EmbedBuilder } = require('discord.js');

module.exports = async function postBookList(client) {
    const channelId = '1404563095824896151'; // ID channel daftar buku
    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel) {
            console.error(`[BOOKLIST] Channel dengan ID ${channelId} tidak ditemukan.`);
            return;
        }

        // Ambil data buku dari database
        const [rows] = await client.db.query(
            `SELECT nama_buku, penerbit, stok_tersedia, mata_pelajaran_terkait 
             FROM buku ORDER BY nama_buku ASC`
        );

        if (!rows.length) {
            await channel.send('📚 Tidak ada data buku yang tersedia di perpustakaan.');
            return;
        }

        // Buat header tabel
        let table = '```' +
            '\n| No | Nama Buku                | Mapel        | Stok |' +
            '\n|----|--------------------------|--------------|------|';

        // Isi data buku
        rows.forEach((buku, idx) => {
            table += `\n| ${String(idx + 1).padEnd(2)} | ${buku.nama_buku.padEnd(24)} | ${String(buku.mata_pelajaran_terkait).padEnd(12)} | ${String(buku.stok_tersedia).padEnd(4)} |`;
        });

        table += '\n```';

        // Kirim ke channel
        await channel.send({
            content: `**📚 Daftar Buku Perpustakaan**\nBerikut adalah daftar buku yang tersedia:\n${table}`
        });

    } catch (err) {
        console.error('[BOOKLIST] Gagal mengirim daftar buku:', err);
    }
};*/