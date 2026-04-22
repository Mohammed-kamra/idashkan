const express = require("express");
const router = express.Router();
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  clearNotifications,
} = require("../controllers/notificationController");

// Public - VAPID public key for push subscription
router.get("/vapid-public", (req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) {
    return res.status(503).json({
      success: false,
      message: "Push notifications not configured",
    });
  }
  res.json({ success: true, vapidPublicKey: key });
});

router.get("/", getNotifications);
router.put("/read-all", markAllAsRead);
router.put("/clear", clearNotifications);
router.put("/:id/read", markAsRead);

module.exports = router;
