const express = require("express");
const router = express.Router();
const {
  register,
  login,
  googleLogin,
  googleOAuthStart,
  googleOAuthCallback,
  getProfile,
  updateProfile,
  changePassword,
  logout,
  deactivate,
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");

// Public routes
router.post("/register", register);
router.post("/login", login);
router.get("/google/start", googleOAuthStart);
router.get("/google/callback", googleOAuthCallback);
router.post("/google", googleLogin);

// Protected routes (require authentication)
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);
router.put("/change-password", protect, changePassword);
router.post("/logout", protect, logout);
router.post("/deactivate", protect, deactivate);

module.exports = router;
