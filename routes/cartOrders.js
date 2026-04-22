const express = require("express");
const router = express.Router();
const { createCartOrderLog } = require("../controllers/cartOrderLogController");

router.post("/log", createCartOrderLog);

module.exports = router;
