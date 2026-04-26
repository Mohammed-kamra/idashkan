const mongoose = require("mongoose");
const Product = require("../models/Product");
const Store = require("../models/Store");
const Brand = require("../models/Brand");
const Company = require("../models/Company");
const Category = require("../models/Category");
const User = require("../models/User");
const {
  hasOwnerDataEntryScope,
  assertOwnerDataEntryCanCreateProduct,
  buildOwnerDataEntryProductFilter,
  productMatchesOwnerDataEntryScope,
  primaryOwnerIdsFromProduct,
} = require("../utils/ownerDataEntryScope");
const {
  isOwnerDataEntryRole,
  isOwnerDataEntryOnlyRole,
} = require("../utils/roleHelpers");
const {
  canApprovePendingProducts,
  canListPendingProducts,
} = require("../utils/pendingReviewers");
const { normalizeExpiryDate } = require("../utils/normalizeExpiryDate");
const { parseOptionalNonNegativePrice } = require("../utils/productPriceValidation");
const {
  categoryList,
  categoryDetail,
  storeList,
  storeDetail,
  brandList,
  brandDetail,
  companyList,
  companyDetail,
  storeTypeList,
} = require("../utils/refPopulate");

/**
 * Strip immutable fields and fix empty strings on ObjectId refs — "" breaks Mongoose cast
 * and was incorrectly surfaced as 404 "Product not found" via CastError.kind === "ObjectId".
 */
function sanitizeProductUpdateBody(body) {
  const {
    storeTypeId,
    storeType: storeTypeName,
    _id,
    __v,
    createdAt,
    updatedAt,
    ...rest
  } = body || {};
  const updateDoc = { ...rest };
  const optionalNullIfEmpty = ["brandId", "companyId", "storeId"];
  for (const key of optionalNullIfEmpty) {
    if (updateDoc[key] === "") {
      updateDoc[key] = null;
    }
  }
  if (updateDoc.categoryId === "") {
    delete updateDoc.categoryId;
  }
  if (updateDoc.categoryTypeId === "") {
    delete updateDoc.categoryTypeId;
  }
  if (updateDoc.storeTypeId === "") {
    delete updateDoc.storeTypeId;
  }
  delete updateDoc.pendingReason;
  delete updateDoc.wasEverPublished;
  delete updateDoc.pendingDraft;
  delete updateDoc.discardPendingDraft;
  delete updateDoc.approvedBy;
  delete updateDoc.approvedAt;
  return { updateDoc, storeTypeId, storeTypeName };
}

/** Fields owner data entry may propose on a still-published product (stored in pendingDraft). */
const ODE_PENDING_DRAFT_KEYS = [
  "name",
  "barcode",
  "previousPrice",
  "newPrice",
  "isDiscount",
  "expireDate",
  "image",
  "storeTypeId",
];

function pickOdePendingDraft(updateDoc) {
  const out = {};
  if (!updateDoc || typeof updateDoc !== "object") return out;
  for (const k of ODE_PENDING_DRAFT_KEYS) {
    if (updateDoc[k] !== undefined) out[k] = updateDoc[k];
  }
  return out;
}

/** Remove internal moderation field from API payloads (public lists). */
function stripPendingDraftFromDocs(docs) {
  return (docs || []).map((doc) => {
    const o = doc && doc.toObject ? doc.toObject() : { ...doc };
    delete o.pendingDraft;
    return o;
  });
}

const getPublicStoreIds = async () => {
  const stores = await Store.find({ statusAll: { $ne: "off" } }).select("_id").lean();
  return stores.map((s) => s._id);
};

const applyPublicVisibilityToProductQuery = (baseQuery, storeIds) => {
  const query = { ...baseQuery };
  const andConditions = Array.isArray(query.$and) ? [...query.$and] : [];

  andConditions.push({
    $or: [
      { storeId: { $exists: false } },
      { storeId: null },
      ...(storeIds.length ? [{ storeId: { $in: storeIds } }] : []),
    ],
  });

  query.$and = andConditions;
  return query;
};

const applyPublishedOnlyToProductQuery = (baseQuery) => {
  const query = { ...baseQuery };
  const andConditions = Array.isArray(query.$and) ? [...query.$and] : [];

  // Keep old records visible while transitioning (no status field yet)
  andConditions.push({
    $or: [{ status: "published" }, { status: { $exists: false } }],
  });

  query.$and = andConditions;
  return query;
};

// @desc    Get all products
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
  try {
    const { brand, category, store } = req.query;
    let query = {};

    if (brand) {
      query.brandId = brand;
    }
    if (store) {
      query.storeId = store;
    }

    if (category) {
      query.categoryId = category;
    }

    const includeAll = String(req.query.includeAll || "").toLowerCase() === "true";
    const storeIds = await getPublicStoreIds();
    let finalQuery = applyPublicVisibilityToProductQuery(query, storeIds);
    if (!includeAll) {
      finalQuery = applyPublishedOnlyToProductQuery(finalQuery);
    }

    const sort = { name: 1 };
    const cursor = Product.find(finalQuery)
      .populate("brandId", brandList)
      .populate("companyId", companyList)
      .populate("storeId", storeList)
      .populate("categoryId", categoryList)
      .populate("storeTypeId", storeTypeList)
      .sort(sort);

    const limitRaw = req.query.limit;
    const limitParsed = parseInt(String(limitRaw ?? ""), 10);
    const hasPagination =
      limitRaw !== undefined &&
      limitRaw !== null &&
      String(limitRaw).trim() !== "" &&
      !Number.isNaN(limitParsed) &&
      limitParsed > 0;

    if (hasPagination) {
      const limit = Math.min(Math.max(limitParsed, 1), 500);
      const page = Math.max(parseInt(String(req.query.page || "1"), 10) || 1, 1);
      const skip = (page - 1) * limit;
      const [products, total] = await Promise.all([
        cursor.clone().skip(skip).limit(limit),
        Product.countDocuments(finalQuery),
      ]);
      return res.json({
        items: stripPendingDraftFromDocs(products),
        total,
        page,
        limit,
      });
    }

    const products = await cursor;
    res.json(stripPendingDraftFromDocs(products));
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

// @desc    Get product by ID
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res) => {
  try {
    const productRaw = await Product.findById(req.params.id).select(
      "_id storeId status"
    );

    if (!productRaw) {
      return res.status(404).json({ msg: "Product not found" });
    }

    const isPublished =
      productRaw.status === "published" || typeof productRaw.status === "undefined";
    const storeVisible = productRaw.storeId
      ? await Store.exists({
          _id: productRaw.storeId,
          statusAll: { $ne: "off" },
        })
      : true;

    if (!storeVisible || !isPublished) {
      return res.status(404).json({ msg: "Product not found" });
    }

    const product = await Product.findById(req.params.id)
      .populate("brandId", brandDetail)
      .populate("companyId", companyDetail)
      .populate("storeId", storeDetail)
      .populate("categoryId", categoryDetail)
      .populate("storeTypeId", storeTypeList);

    if (!product) {
      return res.status(404).json({ msg: "Product not found" });
    }

    const pub = product.toObject ? product.toObject() : product;
    delete pub.pendingDraft;
    res.json(pub);
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Product not found" });
    }
    res.status(500).send("Server Error");
  }
};

// @desc    Create product
// @route   POST /api/products
// @access  Private (Admin)
const createProduct = async (req, res) => {
  // Log the incoming request body for debugging
  console.log("[createProduct] Request body:", req.body);
  const {
    name,
    nameEn,
    nameAr,
    nameKu,
    type,
    categoryTypeId,
    image,
    previousPrice,
    newPrice,
    isDiscount,
    weight,
    brandId,
    companyId,
    categoryId,
    description,
    descriptionEn,
    descriptionAr,
    descriptionKu,
    barcode,
    storeId,
    storeTypeId: providedStoreTypeId,
    storeType: providedStoreTypeName,
    status,
    expireDate,
  } = req.body;

  const hasStoreId =
    storeId != null &&
    String(storeId).trim() !== "" &&
    String(storeId).trim() !== "null";

  try {
    if (isOwnerDataEntryRole(req.user)) {
      const user = await User.findById(req.user._id).lean();
      if (!user) {
        return res.status(401).json({ msg: "Unauthorized" });
      }
      if (!hasOwnerDataEntryScope(user)) {
        return res
          .status(403)
          .json({ msg: "Owner data entry scope not configured" });
      }
      const v = await assertOwnerDataEntryCanCreateProduct(user, {
        storeId,
        brandId,
        companyId,
      });
      if (!v.ok) {
        return res.status(400).json({ msg: v.message });
      }

      const nameTrim = String(name || "").trim();
      if (!nameTrim) {
        return res.status(400).json({ msg: "name is required" });
      }

      let store = null;
      if (hasStoreId) {
        store = await Store.findById(storeId);
        if (!store) {
          return res.status(404).json({ msg: "Store not found" });
        }
      }

      const StoreType = require("../models/StoreType");
      let storeTypeIdToUse = providedStoreTypeId;
      if (!storeTypeIdToUse && providedStoreTypeName) {
        const st = await StoreType.findOne({ name: providedStoreTypeName });
        if (!st) {
          return res
            .status(400)
            .json({ msg: `Invalid storeType name: ${providedStoreTypeName}` });
        }
        storeTypeIdToUse = st._id;
      }
      if (hasStoreId && store) {
        if (!storeTypeIdToUse && store.storeTypeId) {
          storeTypeIdToUse = store.storeTypeId;
        }
        if (!storeTypeIdToUse) {
          return res.status(400).json({
            msg:
              "storeTypeId is required when a store is set (assign a store type on the store or send storeTypeId)",
          });
        }
      }

      const prevODE = parseOptionalNonNegativePrice(
        previousPrice,
        "previousPrice",
      );
      if (!prevODE.ok) return res.status(400).json({ msg: prevODE.msg });
      const newODE = parseOptionalNonNegativePrice(newPrice, "newPrice");
      if (!newODE.ok) return res.status(400).json({ msg: newODE.msg });

      // Owner data entry: new products always start pending until admin/support publishes.
      const newProduct = new Product({
        name: nameTrim,
        barcode: barcode || undefined,
        image: image || undefined,
        previousPrice: prevODE.value,
        newPrice: newODE.value,
        isDiscount: !!isDiscount,
        expireDate: expireDate ? normalizeExpiryDate(expireDate) : undefined,
        brandId: brandId || null,
        companyId: companyId || null,
        storeId: hasStoreId ? storeId : null,
        ...(storeTypeIdToUse ? { storeTypeId: storeTypeIdToUse } : {}),
        status: "pending",
        pendingReason: "adding",
        wasEverPublished: false,
      });

      const product = await newProduct.save();

      if (hasStoreId && storeId) {
        await Store.findByIdAndUpdate(storeId, {
          $set: { lastReleaseDiscountDate: new Date() },
        });
      }

      return res.json(product);
    }

    let store = null;
    if (hasStoreId) {
      store = await Store.findById(storeId);
      if (!store) {
        console.error("[createProduct] Store not found for storeId:", storeId);
        return res.status(404).json({ msg: "Store not found" });
      }
    }

    // Check if brand exists (only if brandId is provided)
    if (brandId) {
      const brand = await Brand.findById(brandId);
      if (!brand) {
        console.error("[createProduct] Brand not found for brandId:", brandId);
        return res.status(404).json({ msg: "Brand not found" });
      }
    }
    if (companyId) {
      const company = await Company.findById(companyId);
      if (!company) {
        console.error(
          "[createProduct] Company not found for companyId:",
          companyId,
        );
        return res.status(404).json({ msg: "Company not found" });
      }
    }

    const hasCategoryId =
      categoryId != null && String(categoryId).trim() !== "";
    const hasCategoryTypeId =
      categoryTypeId != null && String(categoryTypeId).trim() !== "";

    let categoryIdToSave;
    let categoryTypeIdToSave;

    if (hasCategoryId) {
      const category = await Category.findById(categoryId);
      if (!category) {
        console.error(
          "[createProduct] Category not found for categoryId:",
          categoryId,
        );
        return res.status(404).json({ msg: "Category not found" });
      }
      categoryIdToSave = categoryId;
      if (hasCategoryTypeId) {
        const categoryType = category.types.find(
          (type) => type._id.toString() === categoryTypeId,
        );
        if (!categoryType) {
          console.error(
            "[createProduct] Category type not found for categoryTypeId:",
            categoryTypeId,
          );
          return res.status(404).json({ msg: "Category type not found" });
        }
        categoryTypeIdToSave = categoryTypeId;
      }
    }

    const StoreType = require("../models/StoreType");
    let storeTypeIdToUse = providedStoreTypeId;
    if (!storeTypeIdToUse && providedStoreTypeName) {
      const st = await StoreType.findOne({ name: providedStoreTypeName });
      if (!st) {
        return res
          .status(400)
          .json({ msg: `Invalid storeType name: ${providedStoreTypeName}` });
      }
      storeTypeIdToUse = st._id;
    }
    if (hasStoreId && store) {
      if (!storeTypeIdToUse && store.storeTypeId) {
        storeTypeIdToUse = store.storeTypeId;
      }
      if (!storeTypeIdToUse) {
        return res.status(400).json({
          msg: "storeTypeId is required when a store is set (assign a store type on the store or send storeTypeId)",
        });
      }
    }

    const prevParsed = parseOptionalNonNegativePrice(
      previousPrice,
      "previousPrice",
    );
    if (!prevParsed.ok) return res.status(400).json({ msg: prevParsed.msg });
    const newParsed = parseOptionalNonNegativePrice(newPrice, "newPrice");
    if (!newParsed.ok) return res.status(400).json({ msg: newParsed.msg });

    const finalStatus = status === "pending" ? "pending" : "published";

    const newProduct = new Product({
      name,
      nameEn,
      nameAr,
      nameKu,
      type,
      categoryId: categoryIdToSave,
      categoryTypeId: categoryTypeIdToSave,
      description,
      descriptionEn,
      descriptionAr,
      descriptionKu,
      barcode,
      image,
      previousPrice: prevParsed.value,
      newPrice: newParsed.value,
      isDiscount,
      weight,
      brandId,
      companyId,
      storeId: hasStoreId ? storeId : null,
      ...(storeTypeIdToUse ? { storeTypeId: storeTypeIdToUse } : {}),
      status: finalStatus,
      pendingReason: finalStatus === "pending" ? "adding" : null,
      wasEverPublished: finalStatus === "published",
      expireDate,
    });

    const product = await newProduct.save();

    if (hasStoreId && storeId) {
      await Store.findByIdAndUpdate(storeId, {
        $set: { lastReleaseDiscountDate: new Date() },
      });
    }

    console.log("[createProduct] Product created successfully:", product);
    res.json(product);
  } catch (err) {
    console.error("[createProduct] Error:", err);
    res.status(500).send("Server Error");
  }
};

// @desc    Get products by brand
// @route   GET /api/products/brand/:brandId
// @access  Public
const getProductsByBrand = async (req, res) => {
  try {
    const storeIds = await getPublicStoreIds();
    const products = await Product.find(
      applyPublishedOnlyToProductQuery(
        applyPublicVisibilityToProductQuery({ brandId: req.params.brandId }, storeIds)
      )
    )
      .populate("brandId", brandList)
      .populate("companyId", companyList)
      .populate("storeId", storeList)
      .populate("categoryId", categoryList)
      .populate("storeTypeId", storeTypeList)
      .sort({ name: 1 });
    res.json(stripPendingDraftFromDocs(products));
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

// @desc    Get products by company
// @route   GET /api/products/company/:companyId
// @access  Public
const getProductsByCompany = async (req, res) => {
  try {
    const storeIds = await getPublicStoreIds();
    const products = await Product.find(
      applyPublishedOnlyToProductQuery(
        applyPublicVisibilityToProductQuery(
          { companyId: req.params.companyId },
          storeIds,
        ),
      ),
    )
      .populate("brandId", brandList)
      .populate("companyId", companyList)
      .populate("storeId", storeList)
      .populate("categoryId", categoryList)
      .populate("storeTypeId", storeTypeList)
      .sort({ name: 1 });
    res.json(stripPendingDraftFromDocs(products));
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

// @desc    Get products by store
// @route   GET /api/products/store/:storeId
// @access  Public
const getProductsByStore = async (req, res) => {
  try {
    const storeVisible = await Store.exists({
      _id: req.params.storeId,
      statusAll: { $ne: "off" },
    });
    if (!storeVisible) {
      return res.json([]);
    }

    const storeIds = await getPublicStoreIds();
    const products = await Product.find(
      applyPublishedOnlyToProductQuery(
        applyPublicVisibilityToProductQuery({ storeId: req.params.storeId }, storeIds)
      )
    )
      .populate("brandId", brandList)
      .populate("companyId", companyList)
      .populate("storeId", storeList)
      .populate("categoryId", categoryList)
      .populate("storeTypeId", storeTypeList)
      .sort({ name: 1 });
    res.json(stripPendingDraftFromDocs(products));
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

// @desc    Get products by category
// @route   GET /api/products/category/:category
// @access  Public
const getProductsByCategory = async (req, res) => {
  try {
    // The param is a Category ID. Match on categoryId, not the legacy `type` field
    const storeIds = await getPublicStoreIds();
    const products = await Product.find(
      applyPublishedOnlyToProductQuery(
        applyPublicVisibilityToProductQuery({ categoryId: req.params.category }, storeIds)
      )
    )
      .populate("brandId", brandList)
      .populate("companyId", companyList)
      .populate("storeId", storeList)
      .populate("categoryId", categoryList)
      .populate("storeTypeId", storeTypeList)
      .sort({ name: 1 });
    res.json(stripPendingDraftFromDocs(products));
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

// @desc    Get all categories
// @route   GET /api/products/categories
// @access  Public
const getCategories = async (req, res) => {
  try {
    const categories = await Product.distinct("type");
    res.json(categories);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

// @desc    List pending products for moderation
// @route   GET /api/products/pending
// @access  Private
const getPendingProducts = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const user = await User.findById(req.user._id).lean();
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!canListPendingProducts(user)) {
      return res.status(403).json({
        success: false,
        message: "Not allowed to view pending products",
      });
    }

    const reason = String(req.query.pendingReason || "").toLowerCase();

    const hasDraftObj = {
      $expr: {
        $gt: [
          {
            $size: {
              $objectToArray: { $ifNull: ["$pendingDraft", {}] },
            },
          },
          0,
        ],
      },
    };

    let match;
    if (reason === "adding") {
      match = {
        status: "pending",
        wasEverPublished: false,
        $or: [
          { pendingDraft: null },
          { pendingDraft: { $exists: false } },
        ],
      };
    } else if (reason === "editing") {
      match = {
        $or: [
          hasDraftObj,
          {
            status: "pending",
            pendingReason: "editing",
            wasEverPublished: true,
          },
        ],
      };
    } else {
      match = {
        $or: [{ status: "pending" }, hasDraftObj],
      };
    }

    let query = match;
    if (!canApprovePendingProducts(user)) {
      const scope = await buildOwnerDataEntryProductFilter(user);
      query = { $and: [match, scope] };
    }

    const auditUserSelect = "username email displayName";
    const products = await Product.find(query)
      .populate("brandId", brandList)
      .populate("companyId", companyList)
      .populate("storeId", storeList)
      .populate("categoryId", categoryList)
      .populate("storeTypeId", storeTypeList)
      .populate("createdBy", auditUserSelect)
      .populate("updatedBy", auditUserSelect)
      .sort({ updatedAt: -1 })
      .limit(500)
      .lean();

    const normalized = products.map((p) => {
      const draft =
        p.pendingDraft && typeof p.pendingDraft === "object"
          ? p.pendingDraft
          : null;
      const hasPendingDraft = draft && Object.keys(draft).length > 0;
      let displayReason = p.pendingReason;
      if (hasPendingDraft) displayReason = "editing";
      else if (p.status === "pending") displayReason = displayReason || "adding";
      return {
        ...p,
        pendingReason: displayReason,
      };
    });

    res.json(normalized);
  } catch (err) {
    console.error("[getPendingProducts]", err.message);
    res.status(500).send("Server Error");
  }
};

// @desc    List products for Owner Data Entry role (scoped)
// @route   GET /api/products/owner-data-entry
// @access  Private
const getOwnerDataEntryProducts = async (req, res) => {
  try {
    if (!req.user || !isOwnerDataEntryRole(req.user)) {
      return res.status(403).json({
        success: false,
        message: "Owner Data Entry role required",
      });
    }
    const user = await User.findById(req.user._id).lean();
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (!hasOwnerDataEntryScope(user)) {
      return res.json([]);
    }
    const filter = await buildOwnerDataEntryProductFilter(user);
    const products = await Product.find(filter)
      .populate("brandId", brandList)
      .populate("companyId", companyList)
      .populate("storeId", storeList)
      .populate("categoryId", categoryList)
      .populate("storeTypeId", storeTypeList)
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean();
    res.json(products);
  } catch (err) {
    console.error("[getOwnerDataEntryProducts]", err.message);
    res.status(500).send("Server Error");
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private
const updateProduct = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ msg: "Unauthorized" });
    }

    const paramId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(paramId)) {
      return res.status(400).json({ msg: "Invalid product id" });
    }

    const existing = await Product.findById(paramId).lean();
    if (!existing) {
      return res.status(404).json({ msg: "Product not found" });
    }

    const userLean = await User.findById(req.user._id).lean();
    if (!userLean) {
      return res.status(401).json({ msg: "Unauthorized" });
    }

    const isApprover = canApprovePendingProducts(userLean);
    const isOde = isOwnerDataEntryRole(userLean);

    if (!isApprover && !isOde) {
      return res.status(403).json({
        msg: "Not allowed to update products for this account",
      });
    }

    const discardPendingDraft =
      isApprover && req.body && req.body.discardPendingDraft === true;
    const { updateDoc: rawDoc, storeTypeId, storeTypeName } =
      sanitizeProductUpdateBody(req.body);
    const updateDoc = { ...rawDoc };
    if (updateDoc.expireDate !== undefined) {
      updateDoc.expireDate = normalizeExpiryDate(updateDoc.expireDate);
    }
    if (!storeTypeId && storeTypeName) {
      const StoreType = require("../models/StoreType");
      const st = await StoreType.findOne({ name: storeTypeName });
      if (!st) return res.status(400).json({ msg: "Invalid storeType name" });
      updateDoc.storeTypeId = st._id;
    } else if (storeTypeId) {
      updateDoc.storeTypeId = storeTypeId;
    }

    for (const key of ["previousPrice", "newPrice"]) {
      if (updateDoc[key] === undefined) continue;
      const r = parseOptionalNonNegativePrice(updateDoc[key], key);
      if (!r.ok) return res.status(400).json({ msg: r.msg });
      if (r.value === undefined) delete updateDoc[key];
      else updateDoc[key] = r.value;
    }

    if (isOde && !isApprover) {
      const inScope = await productMatchesOwnerDataEntryScope(
        userLean,
        existing._id,
      );
      if (!inScope) {
        return res.status(403).json({ msg: "Not allowed to update this product" });
      }
      if (updateDoc.status === "published") {
        delete updateDoc.status;
      }

      const wasAddingPending =
        existing.status === "pending" &&
        !existing.wasEverPublished &&
        (existing.pendingReason === "adding" ||
          existing.pendingReason == null ||
          existing.pendingReason === undefined);

      // Live published row: keep root fields unchanged; stash proposal in pendingDraft.
      if (existing.status === "published") {
        const draftPick = pickOdePendingDraft(updateDoc);
        const mergedForScope = { ...existing, ...draftPick };
        const primary = primaryOwnerIdsFromProduct(mergedForScope);
        const v = await assertOwnerDataEntryCanCreateProduct(userLean, primary);
        if (!v.ok) {
          return res.status(400).json({ msg: v.message });
        }
        if (Object.keys(draftPick).length === 0) {
          return res.status(400).json({ msg: "No changes to save" });
        }
        const prevDraft =
          existing.pendingDraft && typeof existing.pendingDraft === "object"
            ? existing.pendingDraft
            : {};
        const nextDraft = { ...prevDraft, ...draftPick };
        const product = await Product.findByIdAndUpdate(
          paramId,
          {
            $set: {
              pendingDraft: nextDraft,
              pendingReason: "editing",
            },
          },
          { new: true },
        )
          .populate("brandId", brandList)
          .populate("companyId", companyList)
          .populate("storeTypeId", storeTypeList);
        if (!product) {
          return res.status(404).json({ msg: "Product not found" });
        }
        return res.json(product);
      }

      const merged = { ...existing, ...updateDoc };
      const primary = primaryOwnerIdsFromProduct(merged);
      const v = await assertOwnerDataEntryCanCreateProduct(userLean, primary);
      if (!v.ok) {
        return res.status(400).json({ msg: v.message });
      }

      updateDoc.status = "pending";
      updateDoc.pendingDraft = null;
      updateDoc.approvedBy = null;
      updateDoc.approvedAt = null;
      if (wasAddingPending) {
        updateDoc.pendingReason = "adding";
      } else {
        updateDoc.pendingReason = "editing";
      }
    } else {
      const prevStatus = existing.status;
      const nextStatus =
        updateDoc.status !== undefined ? updateDoc.status : prevStatus;

      if (discardPendingDraft) {
        updateDoc.pendingDraft = null;
        if (existing.status === "published") {
          updateDoc.pendingReason = null;
        }
      }

      if (nextStatus === "published") {
        updateDoc.status = "published";
        updateDoc.wasEverPublished = true;
        updateDoc.pendingReason = null;
        updateDoc.approvedBy = userLean?._id || null;
        updateDoc.approvedAt = new Date();
        const draft =
          existing.pendingDraft &&
          typeof existing.pendingDraft === "object"
            ? existing.pendingDraft
            : null;
        if (draft && Object.keys(draft).length > 0) {
          for (const k of ODE_PENDING_DRAFT_KEYS) {
            if (draft[k] !== undefined) updateDoc[k] = draft[k];
          }
        }
        updateDoc.pendingDraft = null;
      } else if (nextStatus === "pending") {
        updateDoc.approvedBy = null;
        updateDoc.approvedAt = null;
        if (prevStatus === "published" || existing.wasEverPublished) {
          updateDoc.pendingReason = "editing";
        } else if (prevStatus === "pending") {
          updateDoc.pendingReason =
            existing.pendingReason === "editing"
              ? "editing"
              : existing.pendingReason || "adding";
        } else {
          updateDoc.pendingReason = "adding";
        }
      }
    }

    const product = await Product.findByIdAndUpdate(paramId, updateDoc, {
      new: true,
    })
      .populate("brandId", brandList)
      .populate("companyId", companyList)
      .populate("storeTypeId", storeTypeList);

    if (!product) {
      return res.status(404).json({ msg: "Product not found" });
    }
    res.json(product);
  } catch (err) {
    console.error(err.message);
    if (err.name === "CastError") {
      return res.status(400).json({
        msg: err.message || "Invalid field value",
      });
    }
    res.status(500).send("Server Error");
  }
};

// @desc    Full product for moderation (includes pendingDraft; pending/unpublished OK)
// @route   GET /api/products/moderation/:id
// @access  Private
const getProductModerationById = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ msg: "Unauthorized" });
    }
    const user = await User.findById(req.user._id).lean();
    if (!user) {
      return res.status(401).json({ msg: "Unauthorized" });
    }
    if (!canListPendingProducts(user)) {
      return res.status(403).json({ msg: "Not allowed" });
    }
    const paramId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(paramId)) {
      return res.status(400).json({ msg: "Invalid product id" });
    }
    const product = await Product.findById(paramId)
      .populate("brandId", brandList)
      .populate("companyId", companyList)
      .populate("storeId", storeList)
      .populate("categoryId", categoryList)
      .populate("storeTypeId", storeTypeList)
      .lean();
    if (!product) {
      return res.status(404).json({ msg: "Product not found" });
    }
    if (!canApprovePendingProducts(user)) {
      const inScope = await productMatchesOwnerDataEntryScope(
        user,
        product._id,
      );
      if (!inScope) {
        return res.status(403).json({ msg: "Not allowed" });
      }
    }
    res.json(product);
  } catch (err) {
    console.error("[getProductModerationById]", err.message);
    res.status(500).send("Server Error");
  }
};

// @desc    Reject pending submission or discard pendingDraft on published product
// @route   POST /api/products/:id/reject
// @access  Private (admin / support)
const rejectPendingProduct = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ msg: "Unauthorized" });
    }
    const user = await User.findById(req.user._id).lean();
    if (!user) {
      return res.status(401).json({ msg: "Unauthorized" });
    }
    if (!canApprovePendingProducts(user)) {
      return res.status(403).json({ msg: "Not allowed to reject" });
    }
    const paramId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(paramId)) {
      return res.status(400).json({ msg: "Invalid product id" });
    }
    const existing = await Product.findById(paramId).lean();
    if (!existing) {
      return res.status(404).json({ msg: "Product not found" });
    }
    const draft =
      existing.pendingDraft && typeof existing.pendingDraft === "object"
        ? existing.pendingDraft
        : null;
    const hasDraft = draft && Object.keys(draft).length > 0;

    if (hasDraft) {
      await Product.findByIdAndUpdate(paramId, {
        $set: {
          pendingDraft: null,
          pendingReason: null,
        },
      });
      return res.json({
        msg: "Proposed update rejected",
        clearedDraft: true,
      });
    }

    if (existing.status === "pending" && !existing.wasEverPublished) {
      await Product.findByIdAndDelete(paramId);
      return res.json({ msg: "Pending product rejected", removed: true });
    }

    return res.status(400).json({
      msg: "Nothing to reject for this product.",
    });
  } catch (err) {
    console.error("[rejectPendingProduct]", err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Product not found" });
    }
    res.status(500).send("Server Error");
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private (Admin)
const deleteProduct = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ msg: "Unauthorized" });
    }
    if (isOwnerDataEntryOnlyRole(req.user)) {
      return res.status(403).json({
        msg: "Not allowed to delete products for this account",
      });
    }
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ msg: "Product not found" });
    }
    res.json({ msg: "Product removed" });
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Product not found" });
    }
    res.status(500).send("Server Error");
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getPendingProducts,
  getProductModerationById,
  rejectPendingProduct,
  getOwnerDataEntryProducts,
  getProductsByBrand,
  getProductsByCompany,
  getProductsByStore,
  getProductsByCategory,
  getCategories,
};
