const express = require("express");
const router = express.Router();
const { pingAppVisit } = require("../controllers/appVisitController");

router.post("/ping", pingAppVisit);

module.exports = router;
