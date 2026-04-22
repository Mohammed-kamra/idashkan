const mongoose = require("mongoose");
const auditPlugin = require("./plugins/auditPlugin");

const broadcastNotificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    titleEn: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    titleAr: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    titleKu: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    body: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    bodyEn: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    bodyAr: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    bodyKu: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    type: {
      type: String,
      enum: ["info", "promo", "alert", "general"],
      default: "general",
    },
    link: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    expireDate: {
      type: Date,
      required: false,
      index: true,
    },
  },
  { timestamps: true }
);

broadcastNotificationSchema.plugin(auditPlugin);

broadcastNotificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model(
  "BroadcastNotification",
  broadcastNotificationSchema
);
