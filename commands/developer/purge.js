const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const { log } = require('../../utils/logger');
const { handleInteractionError } = require('../../utils/errorHandler'); // ✅ Tambah helper

module.exports = {
    data: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Perintah khusus developer untuk menghapus pesan di channel.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Channel yang akan dibersihkan.')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('jumlah')
                .setDescription('Jumlah pesan terakhir yang akan dihapus (1-100).')
                .setMinValue(1)
                .setMaxValue(100))
        .addUserOption(option =>
            option.setName('pengguna')
                .setDescription('Hanya hapus pesan dari pengguna ini.'))
        .addStringOption(option =>
            option.setName('id_pesan')
                .setDescription('Hapus satu pesan spesifik berdasarkan ID.'))
        .addBooleanOption(option =>
            option.setName('hapus_semua')
                .setDescription('BAHAYA: Hapus semua pesan di channel ini.')),

    async execute(interaction, client) {
        if (!interaction.member.roles.cache.has(client.config.roles.developer)) {
            return interaction.editReply({ content: '❌ Perintah ini hanya untuk Developer.', flags: MessageFlags.Ephemeral });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const channel = interaction.options.getChannel('channel');
        const amount = interaction.options.getInteger('jumlah');
        const user = interaction.options.getUser('pengguna');
        const messageId = interaction.options.getString('id_pesan');
        const deleteAll = interaction.options.getBoolean('hapus_semua');

        try {
            // Hapus satu pesan berdasarkan ID
            if (messageId) {
                const messageToDelete = await channel.messages.fetch(messageId);
                await messageToDelete.delete();
                log('INFO', 'PURGE', `User ${interaction.user.tag} menghapus 1 pesan (ID: ${messageId}) di #${channel.name}.`);
                return interaction.editReply({ content: `✅ Berhasil menghapus 1 pesan dengan ID ​${messageId}​.`, flags: MessageFlags.Ephemeral });
            }

            // Hapus semua pesan di channel
            if (deleteAll) {
                await interaction.editReply({ content: `⌛ Memulai proses penghapusan **semua** pesan di channel ${channel}. Ini mungkin butuh waktu lama...`, flags: MessageFlags.Ephemeral });
                let deletedCount = 0;
                let isDone = false;
                while (!isDone) {
                    const messages = await channel.messages.fetch({ limit: 100 });
                    if (messages.size === 0) {
                        isDone = true;
                        break;
                    }

                    const twoWeeksAgo = Date.now() - 1209600000;
                    const bulkDeletable = messages.filter(m => m.createdTimestamp > twoWeeksAgo);
                    const individuallyDeletable = messages.filter(m => m.createdTimestamp <= twoWeeksAgo);

                    if (bulkDeletable.size > 0) {
                        const deleted = await channel.bulkDelete(bulkDeletable, true);
                        deletedCount += deleted.size;
                    }

                    for (const message of individuallyDeletable.values()) {
                        await message.delete();
                        deletedCount++;
                    }

                    if (individuallyDeletable.size > 0 && bulkDeletable.size === 0 && messages.size > 0) {
                        channel.send(`> Proses penghapusan pesan-pesan lama sedang berjalan... ${deletedCount} pesan telah dihapus.`).then(msg => setTimeout(() => msg.delete(), 5000));
                    }

                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                log('WARN', 'PURGE', `User ${interaction.user.tag} MENGHAPUS SEMUA (${deletedCount}) PESAN di #${channel.name}.`);
                return interaction.followUp({ content: `✅ Selesai! Berhasil menghapus total ${deletedCount} pesan dari channel ${channel}.`, flags: MessageFlags.Ephemeral });
            }

            // Hapus massal dengan filter pengguna opsional
            if (amount) {
                let messages = await channel.messages.fetch({ limit: amount });
                if (user) {
                    messages = messages.filter(m => m.author.id === user.id);
                }

                const deleted = await channel.bulkDelete(messages, true);
                log('INFO', 'PURGE', `User ${interaction.user.tag} menghapus ${deleted.size} pesan di #${channel.name}.`);
                return interaction.editReply({ content: `✅ Berhasil menghapus ${deleted.size} pesan dari channel ${channel}.`, flags: MessageFlags.Ephemeral });
            }

            return interaction.editReply({ content: '⚠️ Anda harus memilih salah satu opsi: `jumlah`, `id_pesan`, atau `hapus_semua`.', flags: MessageFlags.Ephemeral });

        } catch (err) {
            log('ERROR', 'PURGE', `Gagal menghapus pesan di #${channel.name}: ${err.message}`);
            if (err.code === 10008) {
                return interaction.editReply({ content: '❌ Gagal: Pesan tidak ditemukan. Mungkin sudah dihapus atau ID salah.', flags: MessageFlags.Ephemeral });
            }
            if (err.code === 50034) {
                return interaction.editReply({ content: '❌ Gagal: Anda tidak bisa menghapus pesan yang lebih tua dari 14 hari secara massal dengan opsi `jumlah`. Coba kurangi `jumlah` atau gunakan opsi `hapus_semua`.', flags: MessageFlags.Ephemeral });
            }
            await handleInteractionError(interaction);
        }
    },
};