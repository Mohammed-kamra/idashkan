const express = require("express");
const router = express.Router();
const { optionalAuth } = require("../middleware/auth");
const { pingAppVisit } = require("../controllers/appVisitController");

router.post("/ping", optionalAuth, pingAppVisit);

module.exports = router;
