const express = require("express");
const router = express.Router();
const { createFeedback } = require("../controllers/userFeedbackController");

// Public submit route (supports both authenticated user and guest)
router.post("/", createFeedback);

module.exports = router;
