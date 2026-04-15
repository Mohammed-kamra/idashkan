const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const requireOwner = require("../middleware/requireOwner");
const ownerDashboardController = require("../controllers/ownerDashboardController");

router.get(
  "/summary",
  protect,
  requireOwner,
  ownerDashboardController.getSummary,
);
router.get(
  "/top-viewed-products",
  protect,
  requireOwner,
  ownerDashboardController.getTopViewedProducts,
);
router.get(
  "/top-liked-products",
  protect,
  requireOwner,
  ownerDashboardController.getTopLikedProducts,
);
router.get(
  "/comparison-chart",
  protect,
  requireOwner,
  ownerDashboardController.getComparisonChart,
);

module.exports = router;
