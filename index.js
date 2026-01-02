const { Client } = require("discord.js-selfbot-v13");
const express = require("express");
const fs = require("fs");
const path = require("path");
const https = require("https");
const { URL } = require("url");
require("dotenv").config();

const pauseTriggers = require("./ht");
const startFarm = require("./farm");
const startInv = require("./inv");

/* ========= KEEP ALIVE ========= */
const app = express();
app.get("/", (req, res) => res.send("alive"));
app.listen(process.env.PORT || 3000, () =>
  console.log("keep_alive ready")
);

/* ========= CONFIG ========= */
const CHANNEL_ID = "1439626703390507160";
const WW = "408785106942164992";
const WEBHOOK_URL =
  "https://discord.com/api/webhooks/1355134247974731777/6ha_PLkzz7csiWQ5bkMDGZVitbCK4-WbFALeQehvCz7EfTofaDjLLX4_itq6nDPjNOzS";
const TOKEN1 = process.env.TOKEN1;
/* ============================== */

const TOKENS_FILE = path.join(__dirname, "tokens.txt");
const clients = new Map();

/* ---------- WEBHOOK ---------- */
function sendWebhook(text, id) {
  const data = JSON.stringify({
    content: `<@${id}> ${text}`
  });

  const url = new URL(WEBHOOK_URL);
  const req = https.request({
    hostname: url.hostname,
    path: url.pathname,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(data)
    }
  });

  req.write(data);
  req.end();
}

/* ---------- STATS ---------- */
function sendStatsWebhook(client) {
  const hours = (Date.now() - client.stats.startTime) / 3600000;

  const embed = {
    title: "📊 STATS",
    color: 0x00ffcc,
    description:
      `- số lần oh: **${client.stats.oh}**\n` +
      `- số lần ob: **${client.stats.ob}**\n` +
      `- thời gian chạy: **${hours.toFixed(2)} giờ**`,
    timestamp: new Date()
  };

  const data = JSON.stringify({
    content: `<@${client.user.id}>`,
    embeds: [embed]
  });

  const url = new URL(WEBHOOK_URL);
  const req = https.request({
    hostname: url.hostname,
    path: url.pathname,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(data)
    }
  });

  req.write(data);
  req.end();
}

/* ---------- TOKEN FILE ---------- */
function readFile() {
  if (!fs.existsSync(TOKENS_FILE)) return "";
  return fs.readFileSync(TOKENS_FILE, "utf8");
}

function tokenExists(token) {
  return readFile().includes(`=${token}`);
}

function loadTokens() {
  return readFile()
    .split("\n")
    .map(l => l.trim())
    .map(l => l.match(/^token\d+=(.+)$/))
    .filter(Boolean)
    .map(m => m[1]);
}

function saveToken(token, userId) {
  const content = readFile();
  const idx = (content.match(/token\d+=/g) || []).length + 1;
  fs.appendFileSync(
    TOKENS_FILE,
    `token${idx}=${token}\nidtoken${idx}=${userId}\n\n`
  );
}

/* ---------- NORMALIZE TOKENS ---------- */
function normalizeTokensFile() {
  if (!fs.existsSync(TOKENS_FILE)) return;
  const raw = fs.readFileSync(TOKENS_FILE, "utf8");
  const parts = raw.split(/token\d+=/).slice(1);
  const tokens = parts
    .map(p => p.trim().split(/\s+/)[0])
    .filter(t => t.length > 30);

  const unique = [...new Set(tokens)];
  let out = "";
  unique.forEach((t, i) => {
    out += `token${i + 1}=${t}\n`;
  });

  fs.writeFileSync(TOKENS_FILE, out);
}
setInterval(normalizeTokensFile, 5000);

/* ---------- LOGIN TEST ---------- */
function testLogin(token) {
  return new Promise(res => {
    const c = new Client({ checkUpdate: false });
    c.once("ready", () => {
      const id = c.user.id;
      c.destroy();
      res(id);
    });
    c.login(token).catch(() => {
      try { c.destroy(); } catch {}
      res(null);
    });
  });
}

/* ---------- START CLIENT ---------- */
function startClient(token) {
  if (clients.has(token)) return;

  const client = new Client({ checkUpdate: false });
  // ===== INVENTORY SHIM =====
client.global = {
  paused: false,
  inventory: false,
  use: false,
  captchadetected: false,
  rareLevel: 7,
  gems: {
    need: [],
    use: ""
  }
};

client.config = {
  settings: {
    owoprefix: "owo",
    inventory: {
      use: {
        lootbox: true,
        fabledlootbox: true,
        crate: true,
        gems: true
      }
    }
  }
};

client.basic = {
  commandschannelid: CHANNEL_ID
};

client.delay = ms => new Promise(r => setTimeout(r, ms));

client.logger = {
  info: (...a) => console.log("[INFO]", ...a),
  alert: (...a) => console.log("[ALERT]", ...a)
};
// =========================
  client.stats = { oh: 0, ob: 0, startTime: Date.now() };

  let paused = false;

const syncPause = v => {
  paused = v;
  client.global.paused = v;
};

const getPaused = () => paused;
const setPaused = v => syncPause(v);

  client.once("ready", () => {
    console.log(`login (${client.user.username})`);

  client.once("ready", () => {
    console.log(`login (${client.user.username})`);

    startFarm(
      client,
      getPaused,
      setPaused,
      sendWebhook
    );
  //haha//
startInv(client);
});

  /* ---------- MESSAGE LISTENER ---------- */
  client.on("messageCreate", async msg => {
    const content = msg.content.trim();

    if (content.startsWith("?w ")) {
      const newToken = content.slice(3).trim();
      if (newToken.length < 50 || tokenExists(newToken)) return;
      const uid = await testLogin(newToken);
      if (!uid) return;
      saveToken(newToken, uid);
      startClient(newToken);
      sendWebhook("yup", uid);
    }

    if (
      msg.channel.id === CHANNEL_ID &&
      msg.author.id === WW &&
      content === "!stats"
    ) {
      sendStatsWebhook(client);
    }

    if (
      msg.channel.id === CHANNEL_ID &&
      msg.author.id === client.user.id &&
      content === "!pause" &&
      !paused
    ) {
      setPaused(true);
client.global.setPaused(true);
      
      await msg.channel.send("pause");
      sendWebhook("manual pause", client.user.id);
    }

    if (
      msg.channel.id === CHANNEL_ID &&
      msg.author.id === WW &&
      msg.mentions.users.has(client.user.id) &&
      pauseTriggers.some(t =>
        content.toLowerCase().includes(t.toLowerCase())
      )
    ) {
      setPaused(true);
client.global.setPaused(true);
      await msg.channel.send("pause ;)");
      sendWebhook(
        "pause detected\nhttps://owobot.com/captcha",
        client.user.id
      );
    }

    if (
      msg.channel.id === CHANNEL_ID &&
      msg.author.id === client.user.id &&
      content === "!resume" &&
      paused
    ) {
      setPaused(false);
      await msg.channel.send("resume");
    }

    if (
      !msg.guild &&
      msg.author.id === WW &&
      content.toLowerCase().includes("verified that you are human") &&
      paused
    ) {
      setPaused(false);
      const ch = await client.channels.fetch(CHANNEL_ID);
      await ch.send("resume");
    }
  });

  client.login(token).catch(() => {});
  clients.set(token, client);
});

/* ---------- BOOT ---------- */
if (TOKEN1 && TOKEN1.length > 50) startClient(TOKEN1);
loadTokens().forEach(startClient);