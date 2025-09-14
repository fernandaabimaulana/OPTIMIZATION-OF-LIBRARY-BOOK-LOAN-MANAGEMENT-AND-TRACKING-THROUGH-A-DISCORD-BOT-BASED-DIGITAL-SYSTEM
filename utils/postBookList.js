const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

async function generateBookListEmbed(client) {
    // 1. Ambil semua data buku
    const [rows] = await client.db.query(
        `SELECT id_buku, nama_buku, mata_pelajaran_terkait, stok_tersedia, total_stok, tingkat_kelas 
         FROM buku ORDER BY tingkat_kelas ASC, nama_buku ASC`
    );

    // 2. Kelompokkan berdasarkan tingkat kelas
    const kelompok = { Umum: [], X: [], XI: [], XII: [] };
    rows.forEach(buku => {
        const tingkat = buku.tingkat_kelas?.toUpperCase() || 'Umum';
        if (!kelompok[tingkat]) kelompok[tingkat] = [];
        kelompok[tingkat].push(buku);
    });

    // 3. Susun tabel per kelompok (pakai monospace code block)
    const bagian = [];
    for (const tingkat of ['Umum', 'X', 'XI', 'XII']) {
        if (kelompok[tingkat].length > 0) {
            const icon = tingkat === 'Umum' ? '🌐' :
                         tingkat === 'X'    ? '🟦' :
                         tingkat === 'XI'   ? '🟩' :
                         '🟥'; // XII

            // Header tabel
            const header = "No  | Nama Buku          | Mapel           | Stok\n" +
                           "----|-------------------|-----------------|------";

            // Isi tabel
            const rowsTable = kelompok[tingkat].map((buku, idx) => {
                const no = String(idx + 1).padEnd(3);
                const nama = buku.nama_buku.padEnd(18);
                const mapel = (buku.mata_pelajaran_terkait || 'Umum').padEnd(15);
                const stok = `${buku.stok_tersedia}/${buku.total_stok}`;
                return `${no} | ${nama} | ${mapel} | ${stok}`;
            }).join('\n');

            // Bungkus dalam code block
            const listBuku = "```\n" + header + "\n" + rowsTable + "\n```";

            bagian.push(`### ${icon} Kelas ${tingkat}\n${listBuku}`);
        }
    }

    // 4. Buat embed utama
    const embed = new EmbedBuilder()
        .setColor(0x1D82B6)
        .setTitle('📚 Daftar Buku Perpustakaan SMAN Unggulan')
        .setDescription(
            `👋 Selamat datang di **Perpustakaan Digital SMAN Unggulan**!\n\n` +
            `Daftar buku dikelompokkan berdasarkan **tingkat kelas** dalam format tabel.\n\n` +
            bagian.join('\n\n')
        )
        .setFooter({ text: 'Gunakan menu di bawah untuk memilih buku.' })
        .setTimestamp();

    // 5. Dropdown pilihan buku (untuk lihat detail & pinjam)
    const selectOptions = rows.slice(0, 25).map(buku => ({
        label: buku.nama_buku.slice(0, 100),
        description: `Kelas: ${buku.tingkat_kelas || 'Umum'} | Stok: ${buku.stok_tersedia}/${buku.total_stok}`,
        value: String(buku.id_buku),
    }));

    const selectRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('select_book_to_view')
            .setPlaceholder('📖 Pilih buku untuk lihat detail & pinjam...')
            .addOptions(selectOptions)
    );

    return { embeds: [embed], components: [selectRow], ephemeral: false };
}

module.exports = generateBookListEmbed;
