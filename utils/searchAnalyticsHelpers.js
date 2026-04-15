const crypto = require("crypto");

function normalizeSearchText(raw) {
  if (raw == null) return "";
  return String(raw).trim().toLowerCase();
}

function hashIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  const ip =
    (typeof forwarded === "string" && forwarded.split(",")[0]?.trim()) ||
    req.socket?.remoteAddress ||
    req.ip ||
    "";
  if (!ip) return null;
  const secret =
    process.env.SEARCH_LOG_IP_SALT || process.env.JWT_SECRET || "search-log";
  return crypto
    .createHash("sha256")
    .update(`${ip}:${secret}`)
    .digest("hex")
    .slice(0, 32);
}

function parseDateRange(query) {
  const now = new Date();
  let from = query.from ? new Date(query.from) : null;
  let to = query.to ? new Date(query.to) : null;
  if (from && Number.isNaN(from.getTime())) from = null;
  if (to && Number.isNaN(to.getTime())) to = null;
  if (!from && !to) {
    from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    to = now;
  } else if (from && !to) {
    to = now;
  } else if (!from && to) {
    from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  return { from, to };
}

function buildMatchFilter(query) {
  const { from, to } = parseDateRange(query);
  const match = {
    searchedAt: { $gte: from, $lte: to },
  };
  const city = (query.city || "").trim();
  if (city) match["filters.city"] = city;
  const category = (query.category || "").trim();
  if (category) match["filters.category"] = category;
  const source = (query.source || "").trim().toLowerCase();
  if (source === "mainpage" || source === "searchpage") {
    match.source = source;
  }
  return { match, from, to };
}

function previousPeriodRange(from, to) {
  const ms = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime());
  const prevFrom = new Date(from.getTime() - ms);
  return { prevFrom, prevTo };
}

module.exports = {
  normalizeSearchText,
  hashIp,
  parseDateRange,
  buildMatchFilter,
  previousPeriodRange,
};
