const {
  Client,
  GatewayIntentBits,
  Collection,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fs = require("fs");
const config = require("./config.json");
const { readDb, writeDb } = require("./utils");

// --- SETUP DISCORD BOT ---
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

// Load Plugins (Manual Import agar urut)
const pluginVerify = require("./plugin/verify");
const pluginProfile = require("./plugin/profile");
const pluginCampaign = require("./plugin/campaign");
const pluginSubmit = require("./plugin/submit");

// --- SETUP WEB SERVER (ADMIN) ---
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public")); // Folder untuk Web Admin Frontend

// --- DISCORD EVENTS ---

client.once("ready", () => {
  console.log(`Bot logged in as ${client.user.tag}`);
});

// Autocomplete Handler untuk /submit
client.on("interactionCreate", async (interaction) => {
  if (interaction.isAutocomplete()) {
    const command = interaction.commandName;
    if (command === "submit") {
      const db = readDb();
      const focusedValue = interaction.options.getFocused();
      // Filter campaign aktif saja
      const choices = db.campaigns
        .filter((c) => c.status === "active")
        .map((c) => ({ name: c.title, value: c.id }));

      const filtered = choices.filter((choice) =>
        choice.name.toLowerCase().includes(focusedValue.toLowerCase())
      );
      await interaction.respond(filtered.slice(0, 25)); // Max 25 choices
    }
  }
});

// Command & Button Handler
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

  const db = readDb();
  const user = db.users.find((u) => u.discordId === interaction.user.id);

  // --- GATEKEEPER: Cek Verifikasi ---
  // Jika user belum verify, dan mencoba command selain /verify, tolak.
  if (!user) {
    let isVerifyCommand =
      interaction.isChatInputCommand() && interaction.commandName === "verify";
    // Izinkan button click proses verify
    let isVerifyButton =
      interaction.isButton() &&
      interaction.customId.startsWith("verify_check_");

    if (!isVerifyCommand && !isVerifyButton) {
      return interaction.reply({
        content:
          "⚠️ Kamu belum terdaftar! Silakan gunakan `/verify [username]` terlebih dahulu.",
        ephemeral: true,
      });
    }
  }

  try {
    if (interaction.isChatInputCommand()) {
      const { commandName } = interaction;

      if (commandName === "verify") await pluginVerify.execute(interaction);
      else if (commandName === "profile")
        await pluginProfile.executeProfile(interaction);
      else if (commandName === "set-payment")
        await pluginProfile.executeSetPayment(interaction);
      else if (commandName === "campaign-active")
        await pluginCampaign.executeList(interaction);
      else if (commandName === "your-campaign")
        await pluginCampaign.executeYourCampaign(interaction);
      else if (commandName === "submit")
        await pluginSubmit.execute(interaction);
    } else if (interaction.isButton()) {
      if (interaction.customId.startsWith("verify_check_")) {
        await pluginVerify.handleButton(interaction);
      }
    }
  } catch (error) {
    console.error(error);
    if (!interaction.replied)
      await interaction.reply({
        content: "Terjadi kesalahan sistem.",
        ephemeral: true,
      });
  }
});

// --- API ROUTES UNTUK WEB ADMIN ---

// 1. Admin Login
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const db = readDb();
  const admin = db.admins.find(
    (a) => a.username === username && a.password === password
  );
  if (admin) res.json({ success: true, token: "session_token_dummy" });
  else res.json({ success: false, message: "Invalid credentials" });
});

// 2. Get All Data (Dashboard)
app.get("/api/data", (req, res) => {
  const db = readDb();
  // Kirim data tapi sembunyikan password admin
  const cleanAdmins = db.admins.map(({ password, ...rest }) => rest);
  res.json({ ...db, admins: cleanAdmins });
});

// 3. Create Campaign
app.post("/api/campaigns", (req, res) => {
  const db = readDb();
  const newCamp = {
    id: `C-${Date.now()}`,
    ...req.body,
    usedBudget: 0,
    status: "active",
  };
  db.campaigns.push(newCamp);
  writeDb(db);
  res.json({ success: true, message: "Campaign Created" });
});

// 4. Update Submission Status (Approve/Pay)
app.post("/api/submission/update", (req, res) => {
  const { id, status } = req.body;
  const db = readDb();
  const subIndex = db.submissions.findIndex((s) => s.id === id);

  if (subIndex > -1) {
    db.submissions[subIndex].status = status;

    // Jika status jadi Paid Out, update earning campaign & user balance
    if (status === "Paid Out") {
      const sub = db.submissions[subIndex];
      const campIndex = db.campaigns.findIndex((c) => c.id === sub.campaignId);
      const userIndex = db.users.findIndex((u) => u.discordId === sub.userId);

      // Logika sederhana: Bayaran = rate campaign (disesuaikan nanti)
      // Di sini kita anggap admin yang input nominal payout saat approve (fitur advance)
      // Untuk simple: kita ambil earning dari submission stats
      const earning = sub.estimatedEarning || 0;

      if (userIndex > -1) db.users[userIndex].balance += earning;
      if (campIndex > -1) db.campaigns[campIndex].usedBudget += earning;
    }

    writeDb(db);
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false });
  }
});

// Jalankan Server
app.listen(config.port, () => {
  console.log(`Web Admin running at http://localhost:${config.port}`);
});

client.login(config.token);
