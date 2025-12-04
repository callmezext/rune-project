const axios = require("axios");
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");
const { readDb, writeDb } = require("../utils");
const config = require("../config.json");

// Simpan kode verifikasi sementara di memory (bukan DB)
const verifyCache = new Map();

module.exports = {
  execute: async (interaction) => {
    const username = interaction.options.getString("username");
    const db = readDb();

    // Cek user terdaftar
    if (db.users.find((u) => u.discordId === interaction.user.id)) {
      return interaction.reply({
        content: "Kamu sudah terverifikasi!",
        ephemeral: true,
      });
    }

    // Generate 6 angka random
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Simpan state
    verifyCache.set(interaction.user.id, { code, tiktokUsername: username });

    const embed = new EmbedBuilder()
      .setTitle("TikTok Verification")
      .setDescription(
        `Halo **${interaction.user.username}**!\n\n1. Salin kode ini: \`${code}\`\n2. Tempel di **Bio TikTok** akun: **@${username}**\n3. Klik tombol Verify di bawah.`
      )
      .setColor("Blue");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`verify_check_${interaction.user.id}`)
        .setLabel("Verify Now")
        .setStyle(ButtonStyle.Success)
    );

    await interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true,
    });
  },

  handleButton: async (interaction) => {
    const userId = interaction.user.id;
    const data = verifyCache.get(userId);

    if (!data)
      return interaction.reply({
        content: "Sesi verifikasi habis. Ulangi /verify",
        ephemeral: true,
      });

    await interaction.deferReply({ ephemeral: true });

    try {
      // Panggil API
      const res = await axios.get("https://api.alyachan.dev/api/tiktok-stalk", {
        params: { username: data.tiktokUsername, apikey: config.apiKey },
      });

      if (!res.data.status) {
        return interaction.editReply(
          "Gagal mengambil data TikTok. Pastikan username benar."
        );
      }

      const info = res.data.userInfo;
      const bio = info.signature || "";

      // Cek Kode di Bio
      if (bio.includes(data.code)) {
        // SUKSES
        const db = readDb();

        // Cek apakah tiktok ID ini sudah dipakai user lain
        if (db.users.find((u) => u.tiktokId === info.id)) {
          return interaction.editReply(
            "Akun TikTok ini sudah terhubung dengan akun Discord lain!"
          );
        }

        const newUser = {
          discordId: userId,
          discordTag: interaction.user.tag,
          tiktokUsername: info.uniqueId,
          tiktokId: info.id,
          tiktokNickname: info.nickname,
          balance: 0,
          payment: null,
          joinedAt: Math.floor(Date.now() / 1000),
        };

        db.users.push(newUser);
        writeDb(db);
        verifyCache.delete(userId); // Hapus cache

        return interaction.editReply(
          `✅ **Berhasil!** Akun TikTok **${info.nickname}** telah terhubung. Cek /profile.`
        );
      } else {
        return interaction.editReply(
          `❌ Kode \`${data.code}\` tidak ditemukan di bio TikTok kamu. Silakan edit bio dan coba lagi.`
        );
      }
    } catch (error) {
      console.error(error);
      return interaction.editReply("Terjadi kesalahan saat menghubungi API.");
    }
  },
};
