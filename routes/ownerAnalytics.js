const express = require("express");
const router = express.Router();
const { optionalAuth } = require("../middleware/auth");
const { trackEvent } = require("../controllers/ownerAnalyticsController");

router.post("/track", optionalAuth, trackEvent);

module.exports = router;
