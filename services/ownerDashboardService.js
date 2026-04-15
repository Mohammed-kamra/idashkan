const mongoose = require("mongoose");
const OwnerAnalyticsEvent = require("../models/OwnerAnalyticsEvent");
const ProductViewEvent = require("../models/ProductViewEvent");
const ProductLikeEvent = require("../models/ProductLikeEvent");
const SearchLog = require("../models/SearchLog");
const Product = require("../models/Product");
const Video = require("../models/Video");
const Store = require("../models/Store");
const Brand = require("../models/Brand");
const Company = require("../models/Company");

function pctChange(current, previous) {
  if (previous == null || previous === 0) {
    if (current === 0) return 0;
    return 100;
  }
  return Math.round(((current - previous) / previous) * 10000) / 100;
}

function productScopeFilter(entityType, entityId) {
  const id = new mongoose.Types.ObjectId(entityId);
  if (entityType === "store") return { storeId: id };
  if (entityType === "brand") return { brandId: id };
  return { companyId: id };
}

function videoScopeFilter(entityType, entityId) {
  const id = new mongoose.Types.ObjectId(entityId);
  if (entityType === "store") return { storeId: id };
  if (entityType === "brand") return { brandId: id };
  return { companyId: id };
}

async function loadEntityDoc(entityType, entityId) {
  const id = new mongoose.Types.ObjectId(entityId);
  if (entityType === "store") return Store.findById(id).lean();
  if (entityType === "brand") return Brand.findById(id).lean();
  return Company.findById(id).lean();
}

/** Distinct non-empty name variants for store / brand / company. */
function uniqueEntityNameVariants(doc) {
  if (!doc) return [];
  const parts = [doc.name, doc.nameEn, doc.nameAr, doc.nameKu]
    .filter(Boolean)
    .map((p) => String(p).trim())
    .filter(Boolean);
  return [...new Set(parts)].slice(0, 12);
}

/**
 * SearchLog stores the user's query in `normalizedSearchText` (lowercase trimmed).
 * Match the same idea as in-app search: count when typed text matches part of a
 * business name OR the full name appears inside a longer query.
 */
function searchLogMatchExprForEntity(doc) {
  const variants = uniqueEntityNameVariants(doc);
  if (!variants.length) return null;

  /** MongoDB $indexOfCP: [ haystack, needle ] (not { input, substring }). */
  const nameMatchesQuery = (nameLiteral) => ({
    $gte: [
      {
        $indexOfCP: [
          { $toLower: { $literal: nameLiteral } },
          "$normalizedSearchText",
        ],
      },
      0,
    ],
  });

  const queryContainsName = (nameLiteral) => ({
    $gte: [
      {
        $indexOfCP: [
          "$normalizedSearchText",
          { $toLower: { $literal: nameLiteral } },
        ],
      },
      0,
    ],
  });

  const branches = variants.flatMap((nameLiteral) => [
    nameMatchesQuery(nameLiteral),
    queryContainsName(nameLiteral),
  ]);

  return { $or: branches };
}

async function countSearchLogsMatchingEntity(doc, from, to) {
  const expr = searchLogMatchExprForEntity(doc);
  if (!expr) return 0;
  const [row] = await SearchLog.aggregate([
    {
      $match: {
        searchedAt: { $gte: from, $lte: to },
        $expr: expr,
      },
    },
    { $count: "c" },
  ]);
  return row?.c ?? 0;
}

async function countSearchesInRange(entityType, entityId, from, to) {
  const doc = await loadEntityDoc(entityType, entityId);
  return countSearchLogsMatchingEntity(doc, from, to);
}

async function countEventsInRange(entityType, entityId, eventType, from, to) {
  const id = new mongoose.Types.ObjectId(entityId);
  return OwnerAnalyticsEvent.countDocuments({
    entityType,
    entityId: id,
    eventType,
    createdAt: { $gte: from, $lte: to },
  });
}

async function countContactClicksInRange(entityType, entityId, from, to) {
  const id = new mongoose.Types.ObjectId(entityId);
  return OwnerAnalyticsEvent.countDocuments({
    entityType,
    entityId: id,
    eventType: "contact_click",
    createdAt: { $gte: from, $lte: to },
  });
}

async function getFollowersSnapshot(entityType, entityId) {
  const id = new mongoose.Types.ObjectId(entityId);
  if (entityType === "store") {
    const s = await Store.findById(id).select("followerCount").lean();
    return s?.followerCount ?? 0;
  }
  if (entityType === "brand") {
    const b = await Brand.findById(id).select("followerCount").lean();
    return b?.followerCount ?? 0;
  }
  const c = await Company.findById(id).select("followerCount").lean();
  return c?.followerCount ?? 0;
}

async function sumProductLikes(entityType, entityId) {
  const m = productScopeFilter(entityType, entityId);
  const [agg] = await Product.aggregate([
    { $match: m },
    { $group: { _id: null, likes: { $sum: "$likeCount" } } },
  ]);
  return agg?.likes ?? 0;
}

async function sumReelViews(entityType, entityId) {
  const m = videoScopeFilter(entityType, entityId);
  const [agg] = await Video.aggregate([
    { $match: m },
    { $group: { _id: null, v: { $sum: "$views" } } },
  ]);
  return agg?.v ?? 0;
}

function parsePeriod(query) {
  const preset = (query.preset || "").toLowerCase();
  const now = new Date();
  let from;
  let to = new Date(now);
  to.setHours(23, 59, 59, 999);

  if (preset === "last7" || preset === "last7d") {
    from = new Date(now);
    from.setDate(from.getDate() - 7);
    from.setHours(0, 0, 0, 0);
  } else if (preset === "last30" || preset === "last30d") {
    from = new Date(now);
    from.setDate(from.getDate() - 30);
    from.setHours(0, 0, 0, 0);
  } else if (preset === "thismonth") {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
    from.setHours(0, 0, 0, 0);
  } else if (query.from && query.to) {
    from = new Date(query.from);
    to = new Date(query.to);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      from = new Date(now);
      from.setDate(from.getDate() - 30);
      from.setHours(0, 0, 0, 0);
      to = new Date(now);
      to.setHours(23, 59, 59, 999);
    } else {
      to.setHours(23, 59, 59, 999);
    }
  } else {
    from = new Date(now);
    from.setDate(from.getDate() - 30);
    from.setHours(0, 0, 0, 0);
  }

  const ms = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime() - 1);
  prevTo.setHours(23, 59, 59, 999);
  const prevFrom = new Date(prevTo.getTime() - ms);
  prevFrom.setHours(0, 0, 0, 0);

  return { from, to, prevFrom, prevTo };
}

function cardMetric(current, previous) {
  return {
    current,
    previous,
    changePercent: pctChange(current, previous),
    direction: current >= previous ? "up" : "down",
  };
}

async function buildSummary(entityType, entityId, query) {
  const { from, to, prevFrom, prevTo } = parsePeriod(query);

  const id = new mongoose.Types.ObjectId(entityId);

  const [
    followersNow,
    pvNow,
    pvPrev,
    ccNow,
    ccPrev,
    likesTotal,
    searchNow,
    searchPrev,
    rvTotal,
    ordNow,
    ordPrev,
  ] = await Promise.all([
    getFollowersSnapshot(entityType, entityId),
    countEventsInRange(entityType, entityId, "profile_view", from, to),
    countEventsInRange(entityType, entityId, "profile_view", prevFrom, prevTo),
    countContactClicksInRange(entityType, entityId, from, to),
    countContactClicksInRange(entityType, entityId, prevFrom, prevTo),
    sumProductLikes(entityType, entityId),
    countSearchesInRange(entityType, entityId, from, to),
    countSearchesInRange(entityType, entityId, prevFrom, prevTo),
    sumReelViews(entityType, entityId),
    countEventsInRange(entityType, entityId, "order_request", from, to),
    countEventsInRange(entityType, entityId, "order_request", prevFrom, prevTo),
  ]);

  const followers = cardMetric(followersNow, followersNow);
  const profileViews = cardMetric(pvNow, pvPrev);
  const contactClicks = cardMetric(ccNow, ccPrev);
  const productLikes = cardMetric(likesTotal, likesTotal);
  const searches = cardMetric(searchNow, searchPrev);
  const reelViews = cardMetric(rvTotal, rvTotal);
  const orderRequests = cardMetric(ordNow, ordPrev);

  const dailyBuckets = Math.min(
    30,
    Math.ceil((to - from) / (24 * 60 * 60 * 1000)) || 30,
  );
  const spark = await buildSparklines(
    entityType,
    entityId,
    from,
    to,
    Math.min(dailyBuckets, 14),
    followersNow,
    likesTotal,
    rvTotal,
  );

  const entityDoc = await loadEntityDoc(entityType, entityId);
  const entityName =
    entityDoc?.nameEn || entityDoc?.name || entityDoc?.nameKu || "—";

  return {
    period: { from, to },
    previousPeriod: { from: prevFrom, to: prevTo },
    entityType,
    entityId: String(entityId),
    entityName,
    /** Raw name fields for client-side localization (same shape as Product). */
    entity: entityDoc
      ? {
          name: entityDoc.name,
          nameEn: entityDoc.nameEn,
          nameAr: entityDoc.nameAr,
          nameKu: entityDoc.nameKu,
        }
      : null,
    cards: {
      followers: { ...followers, spark: spark.followers },
      profileViews: { ...profileViews, spark: spark.profileViews },
      contactClicks: { ...contactClicks, spark: spark.contactClicks },
      productLikes: { ...productLikes, spark: spark.productLikes },
      searches: { ...searches, spark: spark.searches },
      reelViews: { ...reelViews, spark: spark.reelViews },
      orderRequests: { ...orderRequests, spark: spark.orderRequests },
    },
  };
}

async function buildSparklines(
  entityType,
  entityId,
  from,
  to,
  buckets,
  followersTotal,
  likesTotal,
  reelTotal,
) {
  const id = new mongoose.Types.ObjectId(entityId);
  const ms = to.getTime() - from.getTime();
  const step = ms / buckets || 1;
  const labels = [];
  for (let i = 0; i < buckets; i += 1) {
    labels.push({
      start: new Date(from.getTime() + i * step),
      end: new Date(from.getTime() + (i + 1) * step),
    });
  }

  async function bucketCounts(eventType) {
    const out = [];
    for (const { start, end } of labels) {
      const n = await OwnerAnalyticsEvent.countDocuments({
        entityType,
        entityId: id,
        eventType,
        createdAt: { $gte: start, $lt: end },
      });
      out.push(n);
    }
    return out;
  }

  async function bucketSearchCounts() {
    const doc = await loadEntityDoc(entityType, entityId);
    const expr = searchLogMatchExprForEntity(doc);
    if (!expr) return labels.map(() => 0);
    const out = [];
    for (const { start, end } of labels) {
      const [row] = await SearchLog.aggregate([
        {
          $match: {
            searchedAt: { $gte: start, $lt: end },
            $expr: expr,
          },
        },
        { $count: "c" },
      ]);
      out.push(row?.c ?? 0);
    }
    return out;
  }

  const [profileViews, contactClicks, orderRequests, searches] =
    await Promise.all([
      bucketCounts("profile_view"),
      bucketCounts("contact_click"),
      bucketCounts("order_request"),
      bucketSearchCounts(),
    ]);

  const followers = labels.map(() => followersTotal);
  const productLikes = labels.map(() =>
    Math.round((likesTotal || 0) / buckets),
  );
  const reelViews = labels.map(() => Math.round((reelTotal || 0) / buckets));

  return {
    followers,
    profileViews,
    contactClicks,
    productLikes,
    searches,
    reelViews,
    orderRequests,
  };
}

async function topViewedProducts(entityType, entityId, query) {
  const { from, to } = parsePeriod(query);
  const scope = productScopeFilter(entityType, entityId);
  const inScope = await Product.find(scope).select("_id").lean();
  const scopeIds = inScope.map((x) => x._id);
  if (!scopeIds.length) return [];

  const viewsCurr = await ProductViewEvent.aggregate([
    {
      $match: {
        productId: { $in: scopeIds },
        createdAt: { $gte: from, $lte: to },
      },
    },
    { $group: { _id: "$productId", c: { $sum: 1 } } },
    { $sort: { c: -1 } },
    { $limit: 10 },
  ]);

  if (!viewsCurr.length) return [];

  const topIds = viewsCurr.map((x) => x._id);
  const prevLen = to.getTime() - from.getTime();
  const prevFrom = new Date(from.getTime() - prevLen);
  const prevTo = new Date(from.getTime());

  const viewsPrev = await ProductViewEvent.aggregate([
    {
      $match: {
        productId: { $in: topIds },
        createdAt: { $gte: prevFrom, $lt: prevTo },
      },
    },
    { $group: { _id: "$productId", c: { $sum: 1 } } },
  ]);
  const mapCurr = Object.fromEntries(viewsCurr.map((x) => [String(x._id), x.c]));
  const mapPrev = Object.fromEntries(viewsPrev.map((x) => [String(x._id), x.c]));

  const products = await Product.find({ _id: { $in: topIds } })
    .select("name nameEn nameAr nameKu image viewCount likeCount")
    .lean();
  const orderMap = new Map(topIds.map((id, i) => [String(id), i]));
  products.sort(
    (a, b) =>
      (orderMap.get(String(a._id)) ?? 0) - (orderMap.get(String(b._id)) ?? 0),
  );

  return products.map((p) => {
    const id = String(p._id);
    const vc = mapCurr[id] || 0;
    const vp = mapPrev[id] || 0;
    return {
      _id: p._id,
      name: p.name,
      nameEn: p.nameEn,
      nameAr: p.nameAr,
      nameKu: p.nameKu,
      image: p.image,
      viewCount: p.viewCount || 0,
      likeCount: p.likeCount || 0,
      periodViews: vc,
      trendPercent: pctChange(vc, vp),
    };
  });
}

async function topLikedProducts(entityType, entityId, query) {
  const { from, to } = parsePeriod(query);
  const scope = productScopeFilter(entityType, entityId);
  const inScope = await Product.find(scope).select("_id").lean();
  const scopeIds = inScope.map((x) => x._id);
  if (!scopeIds.length) return [];

  const likesCurr = await ProductLikeEvent.aggregate([
    {
      $match: {
        productId: { $in: scopeIds },
        createdAt: { $gte: from, $lte: to },
      },
    },
    { $group: { _id: "$productId", c: { $sum: 1 } } },
    { $sort: { c: -1 } },
    { $limit: 10 },
  ]);

  if (!likesCurr.length) return [];

  const topIds = likesCurr.map((x) => x._id);
  const prevLen = to.getTime() - from.getTime();
  const prevFrom = new Date(from.getTime() - prevLen);
  const prevTo = new Date(from.getTime());

  const likesPrev = await ProductLikeEvent.aggregate([
    {
      $match: {
        productId: { $in: topIds },
        createdAt: { $gte: prevFrom, $lt: prevTo },
      },
    },
    { $group: { _id: "$productId", c: { $sum: 1 } } },
  ]);
  const mapCurr = Object.fromEntries(likesCurr.map((x) => [String(x._id), x.c]));
  const mapPrev = Object.fromEntries(likesPrev.map((x) => [String(x._id), x.c]));

  const products = await Product.find({ _id: { $in: topIds } })
    .select("name nameEn nameAr nameKu image viewCount likeCount")
    .lean();
  const orderMap = new Map(topIds.map((id, i) => [String(id), i]));
  products.sort(
    (a, b) =>
      (orderMap.get(String(a._id)) ?? 0) - (orderMap.get(String(b._id)) ?? 0),
  );

  return products.map((p) => {
    const id = String(p._id);
    const pc = mapCurr[id] || 0;
    const pp = mapPrev[id] || 0;
    return {
      _id: p._id,
      name: p.name,
      nameEn: p.nameEn,
      nameAr: p.nameAr,
      nameKu: p.nameKu,
      image: p.image,
      viewCount: p.viewCount || 0,
      likeCount: p.likeCount || 0,
      periodLikes: pc,
      trendPercent: pctChange(pc, pp),
    };
  });
}

async function comparisonChart(entityType, entityId, query) {
  const { from, to, prevFrom, prevTo } = parsePeriod(query);
  const id = new mongoose.Types.ObjectId(entityId);

  async function seriesForRange(rangeFrom, rangeTo) {
    const pv = await OwnerAnalyticsEvent.countDocuments({
      entityType,
      entityId: id,
      eventType: "profile_view",
      createdAt: { $gte: rangeFrom, $lte: rangeTo },
    });
    const cc = await OwnerAnalyticsEvent.countDocuments({
      entityType,
      entityId: id,
      eventType: "contact_click",
      createdAt: { $gte: rangeFrom, $lte: rangeTo },
    });
    const ord = await OwnerAnalyticsEvent.countDocuments({
      entityType,
      entityId: id,
      eventType: "order_request",
      createdAt: { $gte: rangeFrom, $lte: rangeTo },
    });
    const m = productScopeFilter(entityType, entityId);
    const [likeAgg] = await Product.aggregate([
      { $match: m },
      { $group: { _id: null, likes: { $sum: "$likeCount" } } },
    ]);
    const likes = likeAgg?.likes ?? 0;
    return {
      profileViews: pv,
      contactClicks: cc,
      orderRequests: ord,
      likes,
    };
  }

  const current = await seriesForRange(from, to);
  const previous = await seriesForRange(prevFrom, prevTo);

  return {
    period: { from, to },
    previousPeriod: { from: prevFrom, to: prevTo },
    current,
    previous,
  };
}

module.exports = {
  parsePeriod,
  buildSummary,
  topViewedProducts,
  topLikedProducts,
  comparisonChart,
  productScopeFilter,
};
