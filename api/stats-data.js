// Отдаёт текущие цифры кликов для страницы /stats.
const GROUPS = require("../groups.json");

const GH_OWNER = "oksiomas-cpu";
const GH_REPO = "ciudad-links";
const GH_FILE = "counts.json";
const GH_API = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${GH_FILE}`;

module.exports = async (req, res) => {
  const token = process.env.GH_TOKEN;
  const headers = {
    Authorization: `token ${token}`,
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "ciudad-links",
  };

  let counts = {};
  try {
    const r = await fetch(GH_API, { headers });
    if (r.ok) {
      const data = await r.json();
      counts = JSON.parse(Buffer.from(data.content, "base64").toString("utf-8"));
    }
  } catch (e) {
    // ещё нет данных
  }

  // собираем строки по всем группам (даже с 0 кликов)
  const rows = Object.keys(GROUPS.groups).map((gid) => ({
    gid,
    name: GROUPS.groups[gid],
    clicks: counts[gid] || 0,
  }));
  rows.sort((a, b) => b.clicks - a.clicks);

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(
    JSON.stringify({
      rows,
      total: counts._total || 0,
      updated: counts._updated || null,
    })
  );
};
