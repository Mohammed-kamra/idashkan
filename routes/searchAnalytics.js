const express = require("express");
const router = express.Router();
const { optionalAuth } = require("../middleware/auth");
const {
  logSearch,
  recordClick,
} = require("../controllers/searchAnalyticsController");

router.post("/log-search", optionalAuth, logSearch);
router.patch("/:id/click", optionalAuth, recordClick);

module.exports = router;
