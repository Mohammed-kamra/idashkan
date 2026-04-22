const express = require("express");
const router = express.Router();
const { trackEvent } = require("../controllers/ownerAnalyticsController");

router.post("/track", trackEvent);

module.exports = router;
