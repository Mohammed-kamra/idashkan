const mongoose = require("mongoose");
const SearchLog = require("../models/SearchLog");
const {
  normalizeSearchText,
  hashIp,
} = require("../utils/searchAnalyticsHelpers");
const searchAnalyticsService = require("../services/searchAnalyticsService");

const ALLOWED_TYPES = new Set([
  "product",
  "store",
  "brand",
  "company",
  "category",
  "categoryType",
  "job",
  "gift",
]);

function sanitizeFilters(body) {
  const f = body.filters || {};
  return {
    category: f.category != null ? String(f.category).slice(0, 200) : null,
    city: f.city != null ? String(f.city).slice(0, 120) : null,
    store: f.store != null ? String(f.store).slice(0, 200) : null,
    sortBy: f.sortBy != null ? String(f.sortBy).slice(0, 80) : null,
    priceMin:
      f.priceMin != null && f.priceMin !== ""
        ? Number(f.priceMin)
        : null,
    priceMax:
      f.priceMax != null && f.priceMax !== ""
        ? Number(f.priceMax)
        : null,
  };
}

// POST /api/search-analytics/log-search
exports.logSearch = async (req, res) => {
  try {
    const searchText = String(req.body.searchText || "").trim();
    if (searchText.length < 1) {
      return res.status(400).json({
        success: false,
        message: "searchText is required",
      });
    }

    const source = String(req.body.source || "").toLowerCase();
    if (source !== "mainpage" && source !== "searchpage") {
      return res.status(400).json({
        success: false,
        message: "source must be mainpage or searchpage",
      });
    }

    const deviceType = String(req.body.deviceType || "unknown").toLowerCase();
    const allowedDev = ["mobile", "tablet", "desktop", "unknown"];
    const dev = allowedDev.includes(deviceType) ? deviceType : "unknown";

    const resultCount = Math.max(
      0,
      Math.min(
        1_000_000,
        Number(req.body.resultCount) || 0,
      ),
    );

    const normalized = normalizeSearchText(searchText);
    if (!normalized) {
      return res.status(400).json({
        success: false,
        message: "Invalid searchText",
      });
    }

    const userId = req.userId || null;
    const sessionId =
      req.body.sessionId != null
        ? String(req.body.sessionId).slice(0, 128)
        : null;

    const doc = await SearchLog.create({
      searchText: searchText.slice(0, 500),
      normalizedSearchText: normalized.slice(0, 500),
      userId,
      searchedAt: new Date(),
      filters: sanitizeFilters(req.body),
      resultCount,
      clickedResult: false,
      deviceType: dev,
      source,
      sessionId,
      ipHash: hashIp(req),
    });

    return res.status(201).json({
      success: true,
      data: { id: String(doc._id) },
    });
  } catch (e) {
    console.error("logSearch:", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// PATCH /api/search-analytics/:id/click
exports.recordClick = async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid id" });
    }

    const clickedResultType = String(
      req.body.clickedResultType || "",
    ).toLowerCase();
    if (!ALLOWED_TYPES.has(clickedResultType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid clickedResultType",
      });
    }

    let clickedResultId = req.body.clickedResultId;
    if (clickedResultId != null && clickedResultId !== "") {
      clickedResultId =
        typeof clickedResultId === "object" && clickedResultId.$oid
          ? clickedResultId.$oid
          : String(clickedResultId).slice(0, 128);
    } else {
      clickedResultId = null;
    }

    const update = await SearchLog.findByIdAndUpdate(
      id,
      {
        $set: {
          clickedResult: true,
          clickedResultType,
          clickedResultId,
        },
      },
      { new: true },
    );

    if (!update) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    return res.json({ success: true, data: { id: String(update._id) } });
  } catch (e) {
    console.error("recordClick:", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// --- Admin ---

exports.getOverview = async (req, res) => {
  try {
    const data = await searchAnalyticsService.getOverviewWithCompare(req.query);
    res.json({ success: true, data });
  } catch (e) {
    console.error("getOverview:", e?.message || e);
    res.status(500).json({
      success: false,
      message: e?.message || "Server error",
    });
  }
};

exports.getTrends = async (req, res) => {
  try {
    const rows = await searchAnalyticsService.getTrends(req.query);
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error("getTrends:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getTopKeywords = async (req, res) => {
  try {
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const rows = await searchAnalyticsService.getTopKeywords(req.query, {
      limit,
    });
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error("getTopKeywords:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getNoResults = async (req, res) => {
  try {
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const rows = await searchAnalyticsService.getNoResults(req.query, {
      limit,
    });
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error("getNoResults:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getTopFilters = async (req, res) => {
  try {
    const data = await searchAnalyticsService.getFilterUsage(req.query);
    res.json({ success: true, data });
  } catch (e) {
    console.error("getTopFilters:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getTopStores = async (req, res) => {
  try {
    const { buildMatchFilter } = require("../utils/searchAnalyticsHelpers");
    const { match } = buildMatchFilter(req.query);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 30));
    const rows = await searchAnalyticsService.getTopField(match, "filters.store", {
      limit,
    });
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error("getTopStores:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getTopCategories = async (req, res) => {
  try {
    const { buildMatchFilter } = require("../utils/searchAnalyticsHelpers");
    const { match } = buildMatchFilter(req.query);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 30));
    const rows = await searchAnalyticsService.getTopField(
      match,
      "filters.category",
      { limit },
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error("getTopCategories:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getPopularCities = async (req, res) => {
  try {
    const { buildMatchFilter } = require("../utils/searchAnalyticsHelpers");
    const { match } = buildMatchFilter(req.query);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 30));
    const rows = await searchAnalyticsService.getTopField(match, "filters.city", {
      limit,
    });
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error("getPopularCities:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getConversion = async (req, res) => {
  try {
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 40));
    const minSearches = Math.max(
      1,
      parseInt(req.query.minSearches, 10) || 5,
    );
    const rows = await searchAnalyticsService.getConversionByKeyword(
      req.query,
      { limit, minSearches },
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error("getConversion:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getRecent = async (req, res) => {
  try {
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 40));
    const rows = await searchAnalyticsService.getRecentActivity(req.query, {
      limit,
    });
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error("getRecent:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getTrending = async (req, res) => {
  try {
    const days = Math.min(90, Math.max(1, parseInt(req.query.days, 10) || 7));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const rows = await searchAnalyticsService.getTrendingKeywords(req.query, {
      days,
      limit,
    });
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error("getTrending:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getTopClicked = async (req, res) => {
  try {
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const rows = await searchAnalyticsService.getTopClickedTerms(req.query, {
      limit,
    });
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error("getTopClicked:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.exportCsv = async (req, res) => {
  try {
    const rows = await searchAnalyticsService.exportRows(req.query, {
      limit: 50000,
    });
    const headers = [
      "searchedAt",
      "searchText",
      "normalizedSearchText",
      "userId",
      "source",
      "deviceType",
      "resultCount",
      "clickedResult",
      "clickedResultType",
      "clickedResultId",
      "city",
      "category",
      "store",
      "sortBy",
      "priceMin",
      "priceMax",
      "sessionId",
    ];
    const escape = (v) => {
      const s = v == null ? "" : String(v);
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const lines = [headers.join(",")];
    for (const r of rows) {
      const f = r.filters || {};
      lines.push(
        [
          r.searchedAt ? new Date(r.searchedAt).toISOString() : "",
          r.searchText,
          r.normalizedSearchText,
          r.userId ? String(r.userId) : "",
          r.source,
          r.deviceType,
          r.resultCount,
          r.clickedResult,
          r.clickedResultType || "",
          r.clickedResultId != null ? String(r.clickedResultId) : "",
          f.city || "",
          f.category || "",
          f.store || "",
          f.sortBy || "",
          f.priceMin != null ? f.priceMin : "",
          f.priceMax != null ? f.priceMax : "",
          r.sessionId || "",
        ]
          .map(escape)
          .join(","),
      );
    }
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="search-analytics.csv"',
    );
    res.send("\uFEFF" + lines.join("\n"));
  } catch (e) {
    console.error("exportCsv:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
