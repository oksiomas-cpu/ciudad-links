// Редирект /gN → канал Telegram + тихий счётчик клика в GitHub.
// Человек НЕ ждёт запись — его сразу перекидывает на канал,
// а счёт дописывается в фоне.

const GROUPS = require("../groups.json");

const GH_OWNER = "oksiomas-cpu";
const GH_REPO = "ciudad-links";
const GH_FILE = "counts.json";
const GH_API = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${GH_FILE}`;

async function bumpCount(gid, token) {
  const headers = {
    Authorization: `token ${token}`,
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "ciudad-links",
  };

  // 1. читаем текущий counts.json (если его ещё нет — начинаем с нуля)
  let counts = {};
  let sha = undefined;
  try {
    const r = await fetch(GH_API, { headers });
    if (r.ok) {
      const data = await r.json();
      sha = data.sha;
      counts = JSON.parse(Buffer.from(data.content, "base64").toString("utf-8"));
    }
  } catch (e) {
    // файла нет — это нормально для первого клика
  }

  // 2. +1 клик группе + общий журнал
  counts[gid] = (counts[gid] || 0) + 1;
  counts._total = (counts._total || 0) + 1;
  counts._updated = new Date().toISOString();

  // 3. пишем обратно
  const body = {
    message: `click ${gid} (+1)`,
    content: Buffer.from(JSON.stringify(counts, null, 2)).toString("base64"),
    branch: "main",
  };
  if (sha) body.sha = sha;

  await fetch(GH_API, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });
}

module.exports = async (req, res) => {
  // gid берём из пути: /g1 → "g1"
  const gid = (req.query.gid || "").toLowerCase();
  const token = process.env.GH_TOKEN;

  // куда вести: если группа известна — на канал; иначе тоже на канал
  const target = GROUPS.channel;

  // СНАЧАЛА редирект (человек не ждёт), запись — в фоне
  res.writeHead(302, { Location: target });
  res.end();

  // фоновая запись клика (не блокирует пользователя)
  if (gid && GROUPS.groups[gid] && token) {
    try {
      await bumpCount(gid, token);
    } catch (e) {
      // молча — если счётчик не записался, редирект всё равно сработал
    }
  }
};
