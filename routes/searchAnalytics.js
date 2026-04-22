const express = require("express");
const router = express.Router();
const {
  logSearch,
  recordClick,
} = require("../controllers/searchAnalyticsController");

router.post("/log-search", logSearch);
router.patch("/:id/click", recordClick);

module.exports = router;
