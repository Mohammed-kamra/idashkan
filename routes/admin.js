const express = require("express");
const router = express.Router();
const {
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
} = require("../controllers/adminController");
const { sendNotification } = require("../controllers/adminNotificationController");
const { upsertTranslation, deleteTranslation } = require("../controllers/translationController");
const {
  getAdminCities,
  createCity,
  updateCity,
  deleteCity,
} = require("../controllers/cityController");
const { protect } = require("../middleware/auth");
const requireDataEntry = require("../middleware/requireDataEntry");
const searchAnalyticsController = require("../controllers/searchAnalyticsController");

// GET /api/admin/stats
router.get("/stats", getStats);

// POST /api/admin/notifications/send - admin only
router.post("/notifications/send", protect, sendNotification);

// GET /api/admin/products/most-liked
router.get("/products/most-liked", getMostLikedProducts);

// GET /api/admin/products/most-viewed
router.get("/products/most-viewed", getMostViewedProducts);

// GET /api/admin/reports/stores?storeId=optional
router.get("/reports/stores", getStoreReport);

// GET /api/admin/reports/brands?brandId=optional
router.get("/reports/brands", getBrandReport);

// User management - admin-only, requires auth
router.get("/users", protect, getUsers);
router.post("/users", protect, createUser);
router.put("/users/:id", protect, updateUser);
router.delete("/users/:id", protect, deleteUser);

// Cities — admin-only CRUD (public list: GET /api/cities)
router.get("/cities", protect, getAdminCities);
router.post("/cities", protect, createCity);
router.put("/cities/:id", protect, updateCity);
router.delete("/cities/:id", protect, deleteCity);

// Delete expired products - admin-only, requires auth
router.delete("/products/expired", protect, deleteExpiredProducts);

// Bulk translate product names to EN/AR/KU (skips rows that already have nameEn)
router.post(
  "/products/translate-missing",
  protect,
  translateMissingProductLocales,
);

// UI translations (database overrides; list via GET /api/translations)
router.put("/translations", protect, upsertTranslation);
router.delete("/translations/:id", protect, deleteTranslation);

// Search analytics (admin / data entry)
router.get(
  "/search-analytics/overview",
  protect,
  requireDataEntry,
  searchAnalyticsController.getOverview,
);
router.get(
  "/search-analytics/trends",
  protect,
  requireDataEntry,
  searchAnalyticsController.getTrends,
);
router.get(
  "/search-analytics/top-keywords",
  protect,
  requireDataEntry,
  searchAnalyticsController.getTopKeywords,
);
router.get(
  "/search-analytics/no-results",
  protect,
  requireDataEntry,
  searchAnalyticsController.getNoResults,
);
router.get(
  "/search-analytics/top-filters",
  protect,
  requireDataEntry,
  searchAnalyticsController.getTopFilters,
);
router.get(
  "/search-analytics/top-stores",
  protect,
  requireDataEntry,
  searchAnalyticsController.getTopStores,
);
router.get(
  "/search-analytics/top-categories",
  protect,
  requireDataEntry,
  searchAnalyticsController.getTopCategories,
);
router.get(
  "/search-analytics/popular-cities",
  protect,
  requireDataEntry,
  searchAnalyticsController.getPopularCities,
);
router.get(
  "/search-analytics/conversion",
  protect,
  requireDataEntry,
  searchAnalyticsController.getConversion,
);
router.get(
  "/search-analytics/recent",
  protect,
  requireDataEntry,
  searchAnalyticsController.getRecent,
);
router.get(
  "/search-analytics/trending",
  protect,
  requireDataEntry,
  searchAnalyticsController.getTrending,
);
router.get(
  "/search-analytics/top-clicked",
  protect,
  requireDataEntry,
  searchAnalyticsController.getTopClicked,
);
router.get(
  "/search-analytics/export",
  protect,
  requireDataEntry,
  searchAnalyticsController.exportCsv,
);

module.exports = router;
