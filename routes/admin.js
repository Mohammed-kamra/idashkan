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

module.exports = router;
