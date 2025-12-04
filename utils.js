const fs = require("fs");
const path = "./database.json";

// Fungsi baca database
const readDb = () => {
  try {
    const data = fs.readFileSync(path, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading DB:", err);
    return { users: [], campaigns: [], submissions: [], admins: [] };
  }
};

// Fungsi tulis database
const writeDb = (data) => {
  try {
    fs.writeFileSync(path, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error("Error writing DB:", err);
    return false;
  }
};

module.exports = { readDb, writeDb };
