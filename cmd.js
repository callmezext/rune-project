const { REST, Routes, SlashCommandBuilder } = require("discord.js");
const { token, clientId, guildId } = require("./config.json");

const commands = [
  new SlashCommandBuilder()
    .setName("verify")
    .setDescription("Verifikasi akun TikTok untuk memulai")
    .addStringOption((option) =>
      option
        .setName("username")
        .setDescription("Username TikTok kamu (tanpa @)")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("profile")
    .setDescription("Cek profile, saldo, dan status kamu"),

  new SlashCommandBuilder()
    .setName("campaign-active")
    .setDescription("Lihat daftar campaign yang sedang berjalan"),

  new SlashCommandBuilder()
    .setName("your-campaign")
    .setDescription("Lihat status campaign yang kamu ikuti"),

  new SlashCommandBuilder()
    .setName("set-payment")
    .setDescription("Atur metode pembayaran withdrawal")
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription("Tipe Pembayaran")
        .setRequired(true)
        .addChoices(
          { name: "PayPal", value: "paypal" },
          { name: "DANA", value: "dana" }
        )
    )
    .addStringOption((option) =>
      option
        .setName("account")
        .setDescription("Email (PayPal) atau Nomor HP (DANA)")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("submit")
    .setDescription("Submit video TikTok untuk campaign")
    .addStringOption((option) =>
      option
        .setName("campaign_id")
        .setDescription("ID Campaign (Lihat di /campaign-active)")
        .setRequired(true)
        .setAutocomplete(true)
    ) // Kita pakai Autocomplete biar keren
    .addStringOption((option) =>
      option
        .setName("url")
        .setDescription("Link Video TikTok")
        .setRequired(true)
    ),
];

const rest = new REST({ version: "10" }).setToken(token);

(async () => {
  try {
    console.log("Sedang me-refresh slash commands...");
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commands,
    });
    console.log("Berhasil deploy commands!");
  } catch (error) {
    console.error(error);
  }
})();
