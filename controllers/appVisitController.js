const AppVisitDay = require("../models/AppVisitDay");

/** Calendar day in UTC (YYYY-MM-DD), aligned with plan. */
function utcDayString(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(ymd, delta) {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().slice(0, 10);
}

function parseYmd(s) {
  if (!s || typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s.trim())) {
    return null;
  }
  return s.trim();
}

function pctDelta(current, previous) {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

/**
 * POST /api/app-visits/ping
 * At most one document per (day UTC, visitSessionId).
 */
exports.pingAppVisit = async (req, res) => {
  try {
    const visitSessionId = String(req.body?.visitSessionId || "").trim();
    const deviceId =
      req.body?.deviceId != null ? String(req.body.deviceId).trim() : "";

    if (visitSessionId.length < 8 || visitSessionId.length > 128) {
      return res.status(400).json({
        success: false,
        message: "Invalid visitSessionId",
      });
    }
    if (deviceId.length > 200) {
      return res.status(400).json({
        success: false,
        message: "Invalid deviceId",
      });
    }

    const day = utcDayString(new Date());
    let visitorKey;
    if (req.userId) {
      visitorKey = `user:${req.userId}`;
    } else if (deviceId.length >= 6) {
      visitorKey = `device:${deviceId}`;
    } else {
      visitorKey = `anon:${visitSessionId}`;
    }

    await AppVisitDay.updateOne(
      { day, visitSessionId },
      {
        $setOnInsert: {
          visitorKey,
          userId: req.userId || null,
          deviceId: deviceId || null,
        },
      },
      { upsert: true },
    );

    return res.status(200).json({ success: true });
  } catch (e) {
    if (e.code === 11000) {
      return res.status(200).json({ success: true });
    }
    console.error("[app-visits] ping:", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * GET /api/admin/visitors-report/daily?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
exports.getVisitorsReportDaily = async (req, res) => {
  try {
    const from = parseYmd(req.query.from);
    const to = parseYmd(req.query.to);
    if (!from || !to || from > to) {
      return res.status(400).json({
        success: false,
        message: "Invalid from/to (use YYYY-MM-DD, UTC)",
      });
    }

    const startDay = addUtcDays(from, -1);
    const rows = await AppVisitDay.aggregate([
      {
        $match: {
          day: { $gte: startDay, $lte: to },
        },
      },
      {
        $group: {
          _id: "$day",
          visits: { $sum: 1 },
          uniqueKeys: { $addToSet: "$visitorKey" },
        },
      },
      {
        $project: {
          _id: 0,
          day: "$_id",
          visits: 1,
          uniqueVisitors: { $size: "$uniqueKeys" },
        },
      },
    ]);

    const map = new Map(rows.map((r) => [r.day, r]));

    const series = [];
    let d = from;
    while (d <= to) {
      const cur = map.get(d) || { visits: 0, uniqueVisitors: 0 };
      const prevDay = addUtcDays(d, -1);
      const prev = map.get(prevDay) || { visits: 0, uniqueVisitors: 0 };
      series.push({
        day: d,
        visits: cur.visits,
        uniqueVisitors: cur.uniqueVisitors,
        prevDayVisits: prev.visits,
        prevDayUnique: prev.uniqueVisitors,
        visitsDeltaPct: pctDelta(cur.visits, prev.visits),
        uniqueDeltaPct: pctDelta(cur.uniqueVisitors, prev.uniqueVisitors),
      });
      d = addUtcDays(d, 1);
    }

    const totalVisits = series.reduce((s, x) => s + x.visits, 0);
    const sumDailyUnique = series.reduce((s, x) => s + x.uniqueVisitors, 0);

    return res.json({
      success: true,
      data: {
        series,
        summary: {
          totalVisits,
          sumDailyUniqueVisitors: sumDailyUnique,
          dayCount: series.length,
        },
      },
    });
  } catch (e) {
    console.error("[app-visits] daily report:", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
