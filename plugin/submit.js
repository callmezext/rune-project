const axios = require("axios");
const { readDb, writeDb } = require("../utils");
const config = require("../config.json");

module.exports = {
  execute: async (interaction) => {
    await interaction.deferReply({ ephemeral: true });

    const campaignId = interaction.options.getString("campaign_id");
    const url = interaction.options.getString("url");
    const db = readDb();

    const user = db.users.find((u) => u.discordId === interaction.user.id);
    const campaign = db.campaigns.find((c) => c.id === campaignId);

    if (!campaign)
      return interaction.editReply(
        "Campaign tidak ditemukan atau sudah berakhir."
      );

    // Cek apakah URL sudah pernah di submit
    if (db.submissions.find((s) => s.tiktokUrl === url)) {
      return interaction.editReply("Link video ini sudah pernah disubmit!");
    }

    try {
      // Cek API TikTok
      const res = await axios.get("https://api.alyachan.dev/api/tiktok", {
        params: { url: url, apikey: config.apiKey },
      });

      if (!res.data.status)
        return interaction.editReply(
          "Gagal mengambil data video. Pastikan link benar dan akun tidak private."
        );

      const videoData = res.data;
      const authorId = videoData.author.id;
      const musicId = videoData.music_info.id;

      // Validasi 1: Kepemilikan (Author ID Video == ID User TikTok)
      if (authorId !== user.tiktokId) {
        return interaction.editReply(
          `❌ **Ditolak!** Video ini milik akun lain. Kamu hanya boleh submit video dari akun TikTok yang terverifikasi (@${user.tiktokUsername}).`
        );
      }

      // Validasi 2: Song ID (Music Video == Campaign Song ID)
      if (musicId !== campaign.songId) {
        return interaction.editReply(
          `❌ **Ditolak!** Video tidak menggunakan Sound yang diminta.\nRequired: \`${campaign.songId}\`\nYour Video: \`${musicId}\``
        );
      }

      // Validasi Lolos -> Simpan Submission
      const newSubmission = {
        id: `SUB-${Date.now()}`,
        userId: user.discordId,
        campaignId: campaign.id,
        tiktokUrl: url,
        statsAtSubmit: {
          views: videoData.stats.views,
          likes: videoData.stats.likes,
        },
        estimatedEarning: 0, // Akan dihitung admin atau logic otomatis nanti
        status: "processing",
        payoutAmount: 0,
        submittedAt: Date.now(),
      };

      db.submissions.push(newSubmission);
      writeDb(db);

      return interaction.editReply(
        `✅ **Berhasil Submit!**\nVideo kamu sedang dalam pengecekan (Processing). Cek status di \`/your-campaign\`.`
      );
    } catch (error) {
      console.error(error);
      return interaction.editReply("Terjadi error saat validasi video.");
    }
  },
};
