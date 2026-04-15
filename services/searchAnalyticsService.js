const SearchLog = require("../models/SearchLog");
const {
  buildMatchFilter,
  previousPeriodRange,
} = require("../utils/searchAnalyticsHelpers");

/** Boolean condition (ObjectId must not be used directly as $cond condition — fails on some MongoDB versions). */
function searcherKeyExpr() {
  return {
    $cond: [
      { $ne: [{ $ifNull: ["$userId", null] }, null] },
      { $toString: "$userId" },
      { $ifNull: ["$sessionId", "$ipHash"] },
    ],
  };
}

async function getOverviewStats(matchStage) {
  const [agg] = await SearchLog.aggregate([
    { $match: matchStage },
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              totalSearches: { $sum: 1 },
              clicks: {
                $sum: { $cond: ["$clickedResult", 1, 0] },
              },
              noResultSearches: {
                $sum: { $cond: [{ $eq: ["$resultCount", 0] }, 1, 0] },
              },
            },
          },
        ],
        uniqueKeys: [
          { $project: { k: searcherKeyExpr() } },
          { $match: { k: { $nin: [null, ""] } } },
          { $group: { _id: "$k" } },
          { $group: { _id: null, count: { $sum: 1 } } },
          { $project: { _id: 0, count: 1 } },
        ],
      },
    },
  ]);

  const t = agg?.totals?.[0] || {};
  const totalSearches = t.totalSearches || 0;
  const clicks = t.clicks || 0;
  const noResultSearches = t.noResultSearches || 0;
  const uniqueSearchers = agg?.uniqueKeys?.[0]?.count ?? 0;
  const conversionRate =
    totalSearches > 0 ? Math.round((clicks / totalSearches) * 10000) / 100 : 0;

  return {
    totalSearches,
    uniqueSearchers,
    totalClicks: clicks,
    conversionRate,
    noResultSearches,
  };
}

async function getOverviewWithCompare(query) {
  const { match, from, to } = buildMatchFilter(query);
  const { prevFrom, prevTo } = previousPeriodRange(from, to);
  const prevMatch = {
    ...match,
    searchedAt: { $gte: prevFrom, $lte: prevTo },
  };

  const [current, previous] = await Promise.all([
    getOverviewStats(match),
    getOverviewStats(prevMatch),
  ]);

  return {
    period: { from, to },
    previousPeriod: { from: prevFrom, to: prevTo },
    current,
    previous,
  };
}

async function getTrends(query) {
  const { match } = buildMatchFilter(query);
  const granularity = (query.granularity || "day").toLowerCase();
  const dateFormat =
    granularity === "month"
      ? "%Y-%m"
      : granularity === "week"
        ? "%G-W%V"
        : "%Y-%m-%d";

  return SearchLog.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          $dateToString: { format: dateFormat, date: "$searchedAt" },
        },
        count: { $sum: 1 },
        clicks: { $sum: { $cond: ["$clickedResult", 1, 0] } },
      },
    },
    {
      $project: {
        _id: 0,
        period: "$_id",
        count: 1,
        clicks: 1,
      },
    },
    { $sort: { period: 1 } },
  ]);
}

async function getTopKeywords(query, { limit = 50 } = {}) {
  const { match } = buildMatchFilter(query);
  return SearchLog.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$normalizedSearchText",
        displayText: { $first: "$searchText" },
        count: { $sum: 1 },
        clicks: { $sum: { $cond: ["$clickedResult", 1, 0] } },
      },
    },
    { $sort: { count: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        keyword: "$displayText",
        normalized: "$_id",
        count: 1,
        clicks: 1,
        conversionRate: {
          $cond: [
            { $gt: ["$count", 0] },
            {
              $divide: [
                {
                  $floor: {
                    $multiply: [
                      { $divide: ["$clicks", "$count"] },
                      10000,
                    ],
                  },
                },
                100,
              ],
            },
            0,
          ],
        },
      },
    },
  ]);
}

async function getTopField(match, fieldPath, { limit = 30 } = {}) {
  return SearchLog.aggregate([
    { $match: { ...match, [fieldPath]: { $nin: [null, ""] } } },
    {
      $group: {
        _id: `$${fieldPath}`,
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: limit },
    { $project: { _id: 0, value: "$_id", count: 1 } },
  ]);
}

async function getNoResults(query, { limit = 50 } = {}) {
  const { match } = buildMatchFilter(query);
  return SearchLog.aggregate([
    { $match: { ...match, resultCount: 0 } },
    {
      $group: {
        _id: "$normalizedSearchText",
        displayText: { $first: "$searchText" },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        keyword: "$displayText",
        count: 1,
      },
    },
  ]);
}

async function getTopClickedTerms(query, { limit = 50 } = {}) {
  const { match } = buildMatchFilter(query);
  return SearchLog.aggregate([
    { $match: { ...match, clickedResult: true } },
    {
      $group: {
        _id: "$normalizedSearchText",
        displayText: { $first: "$searchText" },
        clicks: { $sum: 1 },
      },
    },
    { $sort: { clicks: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        keyword: "$displayText",
        clicks: 1,
      },
    },
  ]);
}

async function getFilterUsage(query) {
  const { match } = buildMatchFilter(query);
  const fields = ["category", "city", "store", "sortBy"];
  const out = {};
  for (const f of fields) {
    const path = `filters.${f}`;
    out[f] = await getTopField(match, path, { limit: 20 });
  }
  const priceBuckets = await SearchLog.aggregate([
    { $match: match },
    {
      $match: {
        $or: [
          { "filters.priceMin": { $ne: null } },
          { "filters.priceMax": { $ne: null } },
        ],
      },
    },
    {
      $group: {
        _id: {
          min: "$filters.priceMin",
          max: "$filters.priceMax",
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 15 },
    {
      $project: {
        _id: 0,
        priceMin: "$_id.min",
        priceMax: "$_id.max",
        count: 1,
      },
    },
  ]);
  out.priceRanges = priceBuckets;
  return out;
}

async function getConversionByKeyword(query, { limit = 40, minSearches = 5 } = {}) {
  const { match } = buildMatchFilter(query);
  const rows = await SearchLog.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$normalizedSearchText",
        displayText: { $first: "$searchText" },
        searches: { $sum: 1 },
        clicks: { $sum: { $cond: ["$clickedResult", 1, 0] } },
      },
    },
    { $match: { searches: { $gte: minSearches } } },
    {
      $project: {
        _id: 0,
        keyword: "$displayText",
        searches: 1,
        clicks: 1,
        conversionRate: {
          $cond: [
            { $gt: ["$searches", 0] },
            {
              $divide: [
                {
                  $floor: {
                    $multiply: [
                      { $divide: ["$clicks", "$searches"] },
                      10000,
                    ],
                  },
                },
                100,
              ],
            },
            0,
          ],
        },
      },
    },
    { $sort: { conversionRate: -1, searches: -1 } },
    { $limit: limit },
  ]);
  return rows;
}

async function getRecentActivity(query, { limit = 40 } = {}) {
  const { match } = buildMatchFilter(query);
  return SearchLog.find(match)
    .sort({ searchedAt: -1 })
    .limit(limit)
    .select(
      "searchText normalizedSearchText resultCount clickedResult clickedResultType source deviceType searchedAt filters.city filters.category",
    )
    .lean();
}

async function getTrendingKeywords(query, { days = 7, limit = 20 } = {}) {
  const { match: baseMatch } = buildMatchFilter(query);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const range = baseMatch.searchedAt || {};
  const from = range.$gte
    ? new Date(Math.max(range.$gte.getTime(), since.getTime()))
    : since;
  const to = range.$lte || new Date();
  const match = { ...baseMatch, searchedAt: { $gte: from, $lte: to } };
  return SearchLog.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$normalizedSearchText",
        displayText: { $first: "$searchText" },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        keyword: "$displayText",
        count: 1,
      },
    },
  ]);
}

async function exportRows(query, { limit = 10000 } = {}) {
  const { match } = buildMatchFilter(query);
  return SearchLog.find(match)
    .sort({ searchedAt: -1 })
    .limit(limit)
    .lean();
}

module.exports = {
  getOverviewStats,
  getOverviewWithCompare,
  getTrends,
  getTopKeywords,
  getNoResults,
  getTopClickedTerms,
  getFilterUsage,
  getConversionByKeyword,
  getRecentActivity,
  getTrendingKeywords,
  exportRows,
  getTopField,
};
