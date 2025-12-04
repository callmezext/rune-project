const { EmbedBuilder } = require("discord.js");
const { readDb, writeDb } = require("../utils");

module.exports = {
  executeProfile: async (interaction) => {
    const db = readDb();
    const user = db.users.find((u) => u.discordId === interaction.user.id);

    // Hitung total submission
    const totalSubs = db.submissions.filter(
      (s) => s.userId === interaction.user.id
    ).length;
    const paymentInfo = user.payment
      ? `${user.payment.type.toUpperCase()} (${user.payment.account})`
      : "Belum di-set";

    const embed = new EmbedBuilder()
      .setTitle("User Profile")
      .setThumbnail(interaction.user.displayAvatarURL())
      .addFields(
        {
          name: "TikTok",
          value: `${user.tiktokNickname} (@${user.tiktokUsername})`,
          inline: true,
        },
        { name: "Balance", value: `$${user.balance.toFixed(2)}`, inline: true },
        { name: "Submissions", value: `${totalSubs} Videos`, inline: true },
        { name: "Payment Method", value: paymentInfo, inline: false },
        { name: "Bio/Signature", value: "Verified User", inline: true }
      )
      .setColor("Green");

    const row = new EmbedBuilder().setDescription(
      "Gunakan tombol di bawah (jika ada withdraw) atau gunakan /set-payment"
    ); // Button withdraw bisa ditambahkan nanti

    await interaction.reply({ embeds: [embed] });
  },

  executeSetPayment: async (interaction) => {
    const type = interaction.options.getString("type");
    const account = interaction.options.getString("account");
    const db = readDb();

    const userIndex = db.users.findIndex(
      (u) => u.discordId === interaction.user.id
    );
    db.users[userIndex].payment = { type, account };
    writeDb(db);

    await interaction.reply({
      content: `✅ Payment method updated to: **${type.toUpperCase()} - ${account}**`,
      ephemeral: true,
    });
  },
};
