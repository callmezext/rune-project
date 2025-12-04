const { EmbedBuilder } = require("discord.js");
const { readDb } = require("../utils");

module.exports = {
  executeList: async (interaction) => {
    const db = readDb();
    const activeCampaigns = db.campaigns.filter((c) => c.status === "active");

    if (activeCampaigns.length === 0) {
      return interaction.reply("Belum ada campaign aktif saat ini.");
    }

    const embeds = activeCampaigns.map((camp) => {
      return new EmbedBuilder()
        .setTitle(camp.title)
        .setDescription(camp.description)
        .setImage(camp.coverImage || null)
        .addFields(
          {
            name: "Type",
            value: camp.type === "per_view" ? "Rate Per View" : "Rate Per Post",
            inline: true,
          },
          { name: "Rate", value: `$${camp.rate}`, inline: true },
          {
            name: "Budget Used",
            value: `$${camp.usedBudget} / $${camp.budget}`,
            inline: false,
          },
          {
            name: "Song ID (Required)",
            value: `\`${camp.songId}\``,
            inline: false,
          }
        )
        .setColor("Purple");
    });

    // Discord max 10 embeds per message
    await interaction.reply({ embeds: embeds.slice(0, 10) });
  },

  executeYourCampaign: async (interaction) => {
    const db = readDb();
    const mySubs = db.submissions.filter(
      (s) => s.userId === interaction.user.id
    );

    if (mySubs.length === 0)
      return interaction.reply({
        content: "Kamu belum mengikuti campaign apapun.",
        ephemeral: true,
      });

    let description = "";
    mySubs.forEach((sub) => {
      const camp = db.campaigns.find((c) => c.id === sub.campaignId);
      const statusIcon =
        sub.status === "Paid Out"
          ? "✅"
          : sub.status === "processing"
          ? "⏳"
          : "❌";
      description += `**${
        camp ? camp.title : "Unknown Campaign"
      }**\nStatus: ${statusIcon} ${sub.status}\nEarned: $${
        sub.payoutAmount || 0
      }\n\n`;
    });

    const embed = new EmbedBuilder()
      .setTitle("Your Campaigns")
      .setDescription(description)
      .setColor("Gold");

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
