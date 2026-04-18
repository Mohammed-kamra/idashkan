const mongoose = require("mongoose");
const CartOrderLog = require("../models/CartOrderLog");
const Store = require("../models/Store");

function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

exports.createCartOrderLog = async (req, res) => {
  try {
    const {
      storeId,
      storeName,
      storeNamePrimary,
      storeNameEn,
      storeNameAr,
      storeNameKu,
      orderId,
      items,
      messageText,
      sessionId,
    } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(String(storeId))) {
      return res.status(400).json({ success: false, message: "Invalid storeId" });
    }
    if (!orderId || typeof orderId !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "orderId is required" });
    }

    const rawItems = Array.isArray(items) ? items.slice(0, 100) : [];
    const sanitizedItems = rawItems.map((it) => ({
      productId: String(it?.productId ?? "").slice(0, 64),
      qty: Math.max(0, Math.min(999, Number(it?.qty) || 0)),
      productName: String(it?.productName ?? "").slice(0, 500),
    }));

    const msg =
      messageText != null ? String(messageText).slice(0, 12000) : "";

    const doc = await CartOrderLog.create({
      storeId,
      storeName: String(storeName || "").slice(0, 500),
      storeNamePrimary: String(storeNamePrimary ?? "").slice(0, 500),
      storeNameEn: String(storeNameEn ?? "").slice(0, 500),
      storeNameAr: String(storeNameAr ?? "").slice(0, 500),
      storeNameKu: String(storeNameKu ?? "").slice(0, 500),
      orderId: String(orderId).slice(0, 128),
      items: sanitizedItems,
      messageText: msg,
      sessionId: sessionId ? String(sessionId).slice(0, 128) : null,
      userId: req.userId || null,
    });

    return res.status(201).json({
      success: true,
      data: { id: String(doc._id) },
    });
  } catch (e) {
    console.error("createCartOrderLog:", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.listCartOrderLogs = async (req, res) => {
  try {
    const pageRaw = parseInt(String(req.query.page || "1"), 10);
    const page = Math.max(1, Number.isFinite(pageRaw) ? pageRaw : 1);
    const limitRaw = parseInt(String(req.query.limit || "50"), 10);
    const limit = Math.min(100, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 50));
    const skip = (page - 1) * limit;

    const query = {};
    const storeName = String(req.query.storeName || "").trim().slice(0, 200);
    if (storeName.length > 0) {
      const escaped = storeName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rx = { $regex: escaped, $options: "i" };
      const storeIds = await Store.find({
        $or: [
          { name: rx },
          { nameEn: rx },
          { nameAr: rx },
          { nameKu: rx },
        ],
      })
        .select("_id")
        .lean()
        .then((docs) => docs.map((d) => d._id));

      query.$or = [
        { storeName: rx },
        { storeNamePrimary: rx },
        { storeNameEn: rx },
        { storeNameAr: rx },
        { storeNameKu: rx },
        ...(storeIds.length > 0 ? [{ storeId: { $in: storeIds } }] : []),
      ];
    }

    if (req.query.from) {
      const d = new Date(req.query.from);
      if (!Number.isNaN(d.getTime())) {
        query.createdAt = { ...query.createdAt, $gte: d };
      }
    }
    if (req.query.to) {
      const d = endOfDay(new Date(req.query.to));
      if (!Number.isNaN(d.getTime())) {
        query.createdAt = { ...query.createdAt, $lte: d };
      }
    }

    const [total, rows] = await Promise.all([
      CartOrderLog.countDocuments(query),
      CartOrderLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "email username displayName")
        .lean(),
    ]);

    return res.json({
      success: true,
      data: rows,
      total,
      page,
      limit,
    });
  } catch (e) {
    console.error("listCartOrderLogs:", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
