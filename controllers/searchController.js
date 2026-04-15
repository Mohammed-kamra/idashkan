const Product = require("../models/Product");
const Store = require("../models/Store");
const Brand = require("../models/Brand");
const Company = require("../models/Company");
const Category = require("../models/Category");
const {
  storeList,
  brandList,
  companyList,
  categoryList,
  storeTypeList,
} = require("../utils/refPopulate");

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Match primary + localized name fields (any script / language). */
function nameLangOr(regex) {
  return {
    $or: [
      { name: regex },
      { nameEn: regex },
      { nameAr: regex },
      { nameKu: regex },
    ],
  };
}

function productTextOr(regex) {
  return {
    $or: [
      { name: regex },
      { nameEn: regex },
      { nameAr: regex },
      { nameKu: regex },
      { description: regex },
      { descriptionEn: regex },
      { descriptionAr: regex },
      { descriptionKu: regex },
      { barcode: regex },
    ],
  };
}

// @desc    Search products, stores, brands, categories (all name languages + category/types)
// @route   GET /api/search?q=query&city=Erbil
// @access  Public
const search = async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    const city = (req.query.city || "").trim() || null;
    if (!q || q.length < 2) {
      return res.json({
        success: true,
        data: {
          products: [],
          stores: [],
          brands: [],
          companies: [],
          categories: [],
          categoryTypes: [],
        },
      });
    }

    const regex = new RegExp(escapeRegex(q), "i");
    const limit = 20;

    /** Include stores with show:false so SearchPage can find them; store list still hides them. */
    const storeQuery = {
      statusAll: { $ne: "off" },
      ...nameLangOr(regex),
    };
    if (city) storeQuery.storecity = city;

    const storeIdsInCityPromise = city
      ? Store.find({
          storecity: city,
          statusAll: { $ne: "off" },
        })
          .select("_id")
          .lean()
      : Promise.resolve([]);

    const publishedOr = {
      $or: [{ status: "published" }, { status: { $exists: false } }],
    };

    const [catsByTopName, catsWithTypeFieldMatch] = await Promise.all([
      Category.find({
        isActive: true,
        ...nameLangOr(regex),
      })
        .select("name nameEn nameAr nameKu image icon")
        .limit(limit)
        .lean(),
      Category.find({
        isActive: true,
        $or: [
          { "types.name": regex },
          { "types.nameEn": regex },
          { "types.nameAr": regex },
          { "types.nameKu": regex },
        ],
      })
        .select("name nameEn nameAr nameKu image icon types")
        .limit(80)
        .lean(),
    ]);

    const categoryIdsFromTop = catsByTopName.map((c) => c._id);
    const typeIdsSet = new Set();
    const categoryTypeHits = [];
    const seenTypeHit = new Set();

    for (const c of catsWithTypeFieldMatch) {
      for (const t of c.types || []) {
        const parts = [t.name, t.nameEn, t.nameAr, t.nameKu].filter(Boolean);
        if (!parts.some((text) => regex.test(String(text)))) continue;
        const tid = String(t._id);
        typeIdsSet.add(tid);
        const key = `${c._id}:${tid}`;
        if (seenTypeHit.has(key) || categoryTypeHits.length >= limit) continue;
        seenTypeHit.add(key);
        categoryTypeHits.push({
          category: {
            _id: c._id,
            name: c.name,
            nameEn: c.nameEn,
            nameAr: c.nameAr,
            nameKu: c.nameKu,
            image: c.image,
            icon: c.icon,
          },
          type: {
            _id: t._id,
            name: t.name,
            nameEn: t.nameEn,
            nameAr: t.nameAr,
            nameKu: t.nameKu,
          },
        });
      }
    }
    const typeIds = [...typeIdsSet];

    const productOr = [...(productTextOr(regex).$or || [])];
    if (categoryIdsFromTop.length) {
      productOr.push({ categoryId: { $in: categoryIdsFromTop } });
    }
    if (typeIds.length) {
      productOr.push({ categoryTypeId: { $in: typeIds } });
    }

    const productBaseFilter = {
      $and: [publishedOr, { $or: productOr }],
    };

    const [
      stores,
      storeIdsInCityDocs,
      eligibleStoreIdsDocs,
      productsRaw,
      brandsAll,
      companiesAll,
    ] = await Promise.all([
      Store.find(storeQuery)
        .populate("storeTypeId", storeTypeList)
        .limit(limit)
        .lean(),
      storeIdsInCityPromise,
      Store.find({
        statusAll: { $ne: "off" },
      })
        .select("_id")
        .lean(),
      city
        ? null
        : Product.find(productBaseFilter)
            .populate("brandId", brandList)
            .populate("storeId", storeList)
            .populate("categoryId", categoryList)
            .limit(limit)
            .lean(),
      Brand.find({
        statusAll: { $ne: "off" },
        ...nameLangOr(regex),
      })
        .populate("brandTypeId", "name nameEn nameAr nameKu icon")
        .limit(limit)
        .lean(),
      Company.find({
        statusAll: { $ne: "off" },
        ...nameLangOr(regex),
      })
        .populate("brandTypeId", "name nameEn nameAr nameKu icon")
        .limit(limit)
        .lean(),
    ]);

    const storeIdsInCity = (storeIdsInCityDocs || []).map((s) => s._id);
    /** Stores that are not statusAll off (includes show:false — same as search store results). */
    const eligibleStoreIds = (eligibleStoreIdsDocs || []).map((s) =>
      String(s._id),
    );

    let products;
    let brands;
    let companies;

    if (city) {
      const productDocs = await Product.find({
        ...productBaseFilter,
        storeId: { $in: storeIdsInCity },
      })
        .populate("brandId", brandList)
        .populate("storeId", storeList)
        .populate("categoryId", categoryList)
        .limit(limit)
        .lean();
      products = productDocs;
      brands = brandsAll;
      companies = companiesAll;
    } else {
      products = (productsRaw || []).filter((p) => {
        const storeId = p.storeId && (p.storeId._id || p.storeId);
        const storeOk = !storeId || eligibleStoreIds.includes(String(storeId));
        return storeOk;
      });
      brands = brandsAll;
      companies = companiesAll;
    }

    res.json({
      success: true,
      data: {
        products,
        stores,
        brands,
        companies,
        categories: catsByTopName,
        categoryTypes: categoryTypeHits,
      },
    });
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { search };
