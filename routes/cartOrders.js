const express = require("express");
const router = express.Router();
const { optionalAuth } = require("../middleware/auth");
const { createCartOrderLog } = require("../controllers/cartOrderLogController");

router.post("/log", optionalAuth, createCartOrderLog);

module.exports = router;
