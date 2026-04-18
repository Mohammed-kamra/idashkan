const mongoose = require("mongoose");
const OwnerAnalyticsEvent = require("../models/OwnerAnalyticsEvent");

const CHANNELS = new Set([
  "whatsapp",
  "phone",
  "website",
  "facebook",
  "instagram",
  "tiktok",
  "snapchat",
  "telegram",
  "viber",
  "other",
]);

exports.trackEvent = async (req, res) => {
  try {
    const { eventType, entityType, entityId, channel } = req.body;

    if (!["profile_view", "contact_click", "order_request"].includes(eventType)) {
      return res.status(400).json({ success: false, message: "Invalid eventType" });
    }
    if (!["store", "brand", "company"].includes(entityType)) {
      return res.status(400).json({ success: false, message: "Invalid entityType" });
    }
    if (!mongoose.Types.ObjectId.isValid(String(entityId))) {
      return res.status(400).json({ success: false, message: "Invalid entityId" });
    }

    let ch = channel ? String(channel).toLowerCase() : null;
    if (ch && !CHANNELS.has(ch)) ch = "other";

    await OwnerAnalyticsEvent.create({
      eventType,
      entityType,
      entityId,
      channel:
        eventType === "contact_click" || eventType === "order_request"
          ? ch
          : null,
      userId: req.userId || null,
      sessionId: req.body.sessionId ? String(req.body.sessionId).slice(0, 128) : null,
    });

    res.status(201).json({ success: true });
  } catch (e) {
    console.error("trackEvent:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
