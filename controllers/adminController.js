const mongoose = require("mongoose");
const User = require("../models/User");
const Product = require("../models/Product");
const Store = require("../models/Store");
const Brand = require("../models/Brand");
const Company = require("../models/Company");
const Gift = require("../models/Gift");
const {
  getTranslateApiKey,
  translateToEnArKu,
  formatGoogleFailure,
} = require("../utils/googleTranslate");
const { storeList, brandList } = require("../utils/refPopulate");
const {
  validateAndNormalizeOwnerEntitiesInput,
  normalizeOwnerEntitiesList,
} = require("../utils/ownerEntities");

// Simple admin check helper (by email)
const isAdminUser = (user) => {
  if (!user) return false;
  const adminEmails = ["mshexani45@gmail.com", "admin@gmail.com"];
  return adminEmails.includes(user.email);
};

async function adminOwnerEntityExists(entityType, entityId) {
  if (!entityId || !mongoose.Types.ObjectId.isValid(String(entityId))) {
    return false;
  }
  const id = String(entityId);
  if (entityType === "store") {
    return !!(await Store.findById(id).select("_id").lean());
  }
  if (entityType === "brand") {
    return !!(await Brand.findById(id).select("_id").lean());
  }
  if (entityType === "company") {
    return !!(await Company.findById(id).select("_id").lean());
  }
  return false;
}

// @desc    Get high-level admin stats
// @route   GET /api/admin/stats
const getStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalProducts,
      totalStores,
      totalBrands,
      totalGifts,
      productAgg,
    ] = await Promise.all([
      User.countDocuments({}),
      Product.countDocuments({}),
      Store.countDocuments({}),
      Brand.countDocuments({}),
      Gift.countDocuments({}),
      Product.aggregate([
        {
          $group: {
            _id: null,
            totalViews: { $sum: { $ifNull: ["$viewCount", 0] } },
            totalLikes: { $sum: { $ifNull: ["$likeCount", 0] } },
          },
        },
      ]),
    ]);

    const totals = productAgg && productAgg.length > 0 ? productAgg[0] : {};

    res.json({
      totalUsers,
      totalProducts,
      totalStores,
      totalBrands,
      totalGifts,
      totalViews: totals.totalViews || 0,
      totalLikes: totals.totalLikes || 0,
    });
  } catch (err) {
    console.error("Admin stats error:", err.message);
    res.status(500).send("Server Error");
  }
};

// @desc    Get all users (admin only)
// @route   GET /api/admin/users
const getUsers = async (req, res) => {
  try {
    if (!isAdminUser(req.user)) {
      return res.status(403).json({
        success: false,
        message: "Admin privileges required",
      });
    }

    const pageRaw = parseInt(String(req.query.page || "1"), 10);
    const page = Math.max(1, Number.isFinite(pageRaw) ? pageRaw : 1);
    const limitRaw = parseInt(String(req.query.limit || "20"), 10);
    const limit = Math.min(
      100,
      Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 20),
    );
    const skip = (page - 1) * limit;

    const total = await User.countDocuments({});

    const maxPage = Math.max(1, Math.ceil(total / limit) || 1);
    const safePage = Math.min(page, maxPage);
    const safeSkip = (safePage - 1) * limit;

    const users = await User.find({})
      .select(
        "username email displayName deviceId isActive createdAt role ownerEntityType ownerEntityId ownerEntities",
      )
      .sort({ createdAt: -1 })
      .skip(safeSkip)
      .limit(limit)
      .lean();

    res.json({
      success: true,
      data: users,
      total,
      page: safePage,
      limit,
    });
  } catch (err) {
    console.error("Admin getUsers error:", err.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Create a new registered user (admin only)
// @route   POST /api/admin/users
const createUser = async (req, res) => {
  try {
    if (!isAdminUser(req.user)) {
      return res.status(403).json({
        success: false,
        message: "Admin privileges required",
      });
    }

    const {
      username,
      email,
      password,
      role: roleIn,
      ownerEntityType,
      ownerEntityId,
      ownerEntities: bodyOwnerEntities,
    } = req.body;
    let role = "user";
    if (roleIn === "support") role = "support";
    else if (roleIn === "owner") role = "owner";

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Username, email and password are required",
      });
    }

    if (username.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: "Username must be at least 3 characters long",
      });
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email or username already exists",
      });
    }

    const user = new User({
      username,
      email,
      password,
      role,
    });

    if (role === "owner") {
      if (Array.isArray(bodyOwnerEntities) && bodyOwnerEntities.length) {
        const v = await validateAndNormalizeOwnerEntitiesInput(bodyOwnerEntities);
        if (!v.ok) {
          return res.status(400).json({ success: false, message: v.message });
        }
        user.ownerEntities = v.list;
        user.ownerEntityType = v.list[0].entityType;
        user.ownerEntityId = v.list[0].entityId;
      } else if (
        ownerEntityType &&
        ownerEntityId &&
        ["store", "brand", "company"].includes(ownerEntityType)
      ) {
        if (!(await adminOwnerEntityExists(ownerEntityType, ownerEntityId))) {
          return res.status(400).json({
            success: false,
            message: "Invalid owner entity id",
          });
        }
        user.ownerEntityType = ownerEntityType;
        user.ownerEntityId = ownerEntityId;
        user.ownerEntities = [{ entityType: ownerEntityType, entityId: ownerEntityId }];
      } else {
        return res.status(400).json({
          success: false,
          message:
            "Owner role requires ownerEntities (array) or ownerEntityType + ownerEntityId",
        });
      }
    }

    await user.save();

    const safeUser = {
      _id: user._id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      deviceId: user.deviceId,
      isActive: user.isActive,
      role: user.role || "user",
      ownerEntityType: user.ownerEntityType || null,
      ownerEntityId: user.ownerEntityId || null,
      ownerEntities: (user.ownerEntities || []).map((e) => ({
        entityType: e.entityType,
        entityId: e.entityId,
      })),
      createdAt: user.createdAt,
    };

    res.status(201).json({ success: true, data: safeUser });
  } catch (err) {
    console.error("Admin createUser error:", err.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Update an existing user (admin only)
// @route   PUT /api/admin/users/:id
const updateUser = async (req, res) => {
  try {
    if (!isAdminUser(req.user)) {
      return res.status(403).json({
        success: false,
        message: "Admin privileges required",
      });
    }

    const { id } = req.params;
    const {
      username,
      email,
      displayName,
      isActive,
      password,
      role: roleIn,
      ownerEntityType,
      ownerEntityId,
      ownerEntities: bodyOwnerEntities,
    } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (username !== undefined) user.username = username;
    if (email !== undefined) user.email = email;
    if (displayName !== undefined) user.displayName = displayName && displayName.trim() ? displayName.trim() : null;
    if (password !== undefined && password !== "") user.password = password;
    if (isActive !== undefined) user.isActive = !!isActive;
    if (roleIn !== undefined) {
      if (roleIn === "support") user.role = "support";
      else if (roleIn === "owner") user.role = "owner";
      else user.role = "user";
    }
    if (bodyOwnerEntities !== undefined) {
      if (!Array.isArray(bodyOwnerEntities)) {
        return res.status(400).json({
          success: false,
          message: "ownerEntities must be an array",
        });
      }
      if (user.role === "owner") {
        const v = await validateAndNormalizeOwnerEntitiesInput(bodyOwnerEntities);
        if (!v.ok) {
          return res.status(400).json({ success: false, message: v.message });
        }
        user.ownerEntities = v.list;
        user.ownerEntityType = v.list[0].entityType;
        user.ownerEntityId = v.list[0].entityId;
      }
    } else {
      if (ownerEntityType !== undefined) {
        if (ownerEntityType && !["store", "brand", "company"].includes(ownerEntityType)) {
          return res.status(400).json({
            success: false,
            message: "Invalid ownerEntityType",
          });
        }
        user.ownerEntityType = ownerEntityType || null;
      }
      if (ownerEntityId !== undefined) {
        user.ownerEntityId = ownerEntityId || null;
      }
      if (
        user.role === "owner" &&
        bodyOwnerEntities === undefined &&
        (ownerEntityType !== undefined || ownerEntityId !== undefined)
      ) {
        const t = user.ownerEntityType;
        const eid = user.ownerEntityId;
        if (t && eid && (await adminOwnerEntityExists(t, eid))) {
          user.ownerEntities = [{ entityType: t, entityId: eid }];
        }
      }
    }
    if (user.role === "owner") {
      const nList = normalizeOwnerEntitiesList(user);
      if (!nList.length) {
        return res.status(400).json({
          success: false,
          message: "Owner role requires valid linked businesses",
        });
      }
      if (!user.ownerEntities?.length) {
        user.ownerEntities = nList.map((e) => ({
          entityType: e.entityType,
          entityId: new mongoose.Types.ObjectId(String(e.entityId)),
        }));
        user.ownerEntityType = nList[0].entityType;
        user.ownerEntityId = new mongoose.Types.ObjectId(String(nList[0].entityId));
      } else {
        const t = user.ownerEntityType;
        const eid = user.ownerEntityId;
        if (!t || !eid || !(await adminOwnerEntityExists(t, eid))) {
          return res.status(400).json({
            success: false,
            message: "Owner role requires valid linked businesses",
          });
        }
      }
    } else {
      user.ownerEntityType = null;
      user.ownerEntityId = null;
      user.ownerEntities = [];
    }

    await user.save();

    const safeUser = {
      _id: user._id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      deviceId: user.deviceId,
      isActive: user.isActive,
      role: user.role || "user",
      ownerEntityType: user.ownerEntityType || null,
      ownerEntityId: user.ownerEntityId || null,
      ownerEntities: (user.ownerEntities || []).map((e) => ({
        entityType: e.entityType,
        entityId: e.entityId,
      })),
      createdAt: user.createdAt,
    };

    res.json({ success: true, data: safeUser });
  } catch (err) {
    console.error("Admin updateUser error:", err.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Delete a user (admin only)
// @route   DELETE /api/admin/users/:id
const deleteUser = async (req, res) => {
  try {
    if (!isAdminUser(req.user)) {
      return res.status(403).json({
        success: false,
        message: "Admin privileges required",
      });
    }

    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    await user.deleteOne();

    res.json({ success: true, message: "User deleted" });
  } catch (err) {
    console.error("Admin deleteUser error:", err.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Get most liked products
// @route   GET /api/admin/products/most-liked
const getMostLikedProducts = async (req, res) => {
  try {
    const products = await Product.find({})
      .populate("storeId", storeList)
      .populate("brandId", brandList)
      .sort({ likeCount: -1 })
      .limit(500)
      .lean();
    res.json(products);
  } catch (err) {
    console.error("Admin most liked error:", err.message);
    res.status(500).send("Server Error");
  }
};

// @desc    Get most viewed products
// @route   GET /api/admin/products/most-viewed
const getMostViewedProducts = async (req, res) => {
  try {
    const products = await Product.find({})
      .populate("storeId", storeList)
      .populate("brandId", brandList)
      .sort({ viewCount: -1 })
      .limit(500)
      .lean();
    res.json(products);
  } catch (err) {
    console.error("Admin most viewed error:", err.message);
    res.status(500).send("Server Error");
  }
};

// @desc    Get store report (products by store with stats)
// @route   GET /api/admin/reports/stores?storeName=optional&fromDate=optional&toDate=optional
const getStoreReport = async (req, res) => {
  try {
    const { storeName, fromDate, toDate } = req.query;
    let query = {};

    if (storeName && storeName.trim()) {
      const stores = await Store.find({
        name: { $regex: storeName.trim(), $options: "i" },
      }).select("_id");
      const storeIds = stores.map((s) => s._id);
      if (storeIds.length > 0) {
        query.storeId = { $in: storeIds };
      } else {
        query.storeId = { $in: [] };
      }
    }

    if (fromDate || toDate) {
      query.expireDate = {};
      if (fromDate) query.expireDate.$gte = new Date(fromDate);
      if (toDate) query.expireDate.$lte = new Date(toDate + "T23:59:59.999Z");
    }

    const products = await Product.find(query)
      .populate("storeId", storeList)
      .populate("brandId", brandList)
      .sort({ "storeId.name": 1, likeCount: -1 })
      .lean();
    res.json(products);
  } catch (err) {
    console.error("Admin store report error:", err.message);
    res.status(500).send("Server Error");
  }
};

// @desc    Get brand report (products by brand with stats)
// @route   GET /api/admin/reports/brands?brandName=optional&fromDate=optional&toDate=optional
const getBrandReport = async (req, res) => {
  try {
    const { brandName, fromDate, toDate } = req.query;
    let query = {};

    if (brandName && brandName.trim()) {
      const brands = await Brand.find({
        name: { $regex: brandName.trim(), $options: "i" },
      }).select("_id");
      const brandIds = brands.map((b) => b._id);
      if (brandIds.length > 0) {
        query.brandId = { $in: brandIds };
      } else {
        query.brandId = { $in: [] };
      }
    }

    if (fromDate || toDate) {
      query.expireDate = {};
      if (fromDate) query.expireDate.$gte = new Date(fromDate);
      if (toDate) query.expireDate.$lte = new Date(toDate + "T23:59:59.999Z");
    }

    const products = await Product.find(query)
      .populate("storeId", storeList)
      .populate("brandId", brandList)
      .sort({ "brandId.name": 1, likeCount: -1 })
      .lean();
    res.json(products);
  } catch (err) {
    console.error("Admin brand report error:", err.message);
    res.status(500).send("Server Error");
  }
};

// @desc    Delete products whose expireDate passed more than 1 month ago
// @route   DELETE /api/admin/products/expired
const deleteExpiredProducts = async (req, res) => {
  try {
    if (!isAdminUser(req.user)) {
      return res.status(403).json({
        success: false,
        message: "Admin privileges required",
      });
    }

    const now = new Date();
    const oneMonthAgo = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      now.getDate()
    );

    const result = await Product.deleteMany({
      expireDate: { $exists: true, $ne: null, $lt: oneMonthAgo },
    });

    res.json({
      success: true,
      deletedCount: result.deletedCount || 0,
      message: `Deleted ${result.deletedCount || 0} expired products`,
    });
  } catch (err) {
    console.error("Admin deleteExpiredProducts error:", err.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Products missing English name (null, absent, empty, or whitespace-only nameEn). */
function productMissingEnglishName(doc) {
  const v = doc?.nameEn;
  if (v == null) return true;
  return typeof v === "string" ? v.trim() === "" : String(v).trim() === "";
}

// @desc    Fill nameEn / nameAr / nameKu from primary name via Google Translate (skip if nameEn already set)
// @route   POST /api/admin/products/translate-missing
const translateMissingProductLocales = async (req, res) => {
  try {
    if (!isAdminUser(req.user)) {
      return res.status(403).json({
        success: false,
        message: "Admin privileges required",
      });
    }

    const apiKey = getTranslateApiKey();
    if (!apiKey) {
      return res.status(503).json({
        success: false,
        message:
          "Translation is not configured. Set GOOGLE_TRANSLATE_API_KEY (Google Cloud Translation API key) in server .env.",
      });
    }

    const raw = await Product.find({
      $or: [
        { nameEn: { $exists: false } },
        { nameEn: null },
        { nameEn: "" },
        { nameEn: { $regex: /^\s+$/ } },
      ],
    })
      .select("_id name nameEn")
      .lean();

    const candidates = raw.filter((p) => productMissingEnglishName(p));
    const skippedAlreadyTranslated = await Product.countDocuments({
      nameEn: { $regex: /\S/ },
    });

    let updated = 0;
    let failed = 0;
    const errors = [];

    for (let i = 0; i < candidates.length; i++) {
      const p = candidates[i];
      const source =
        typeof p.name === "string" ? p.name.trim() : String(p.name || "").trim();
      if (!source) {
        failed += 1;
        if (errors.length < 20) {
          errors.push({
            productId: p._id,
            message: "Empty product name; cannot translate.",
          });
        }
        continue;
      }

      try {
        const { english, arabic, kurdish } = await translateToEnArKu(
          apiKey,
          source,
        );
        await Product.updateOne(
          { _id: p._id },
          { $set: { nameEn: english, nameAr: arabic, nameKu: kurdish } },
        );
        updated += 1;
      } catch (err) {
        failed += 1;
        console.error(
          "[translateMissingProductLocales]",
          p._id,
          err?.message || err,
        );
        if (errors.length < 20) {
          errors.push({
            productId: p._id,
            message: formatGoogleFailure(err),
          });
        }
      }

      if (i < candidates.length - 1) {
        await delay(150);
      }
    }

    return res.json({
      success: true,
      updated,
      failed,
      attempted: candidates.length,
      skippedAlreadyTranslated,
      errors: errors.length ? errors : undefined,
    });
  } catch (err) {
    console.error("Admin translateMissingProductLocales error:", err?.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

module.exports = {
  getStats,
  getMostLikedProducts,
  getMostViewedProducts,
  getStoreReport,
  getBrandReport,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  deleteExpiredProducts,
  translateMissingProductLocales,
};
