const mongoose = require("mongoose");

const ownerAnalyticsEventSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      enum: ["profile_view", "contact_click", "order_request"],
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      enum: ["store", "brand", "company"],
      required: true,
      index: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    channel: {
      type: String,
      default: null,
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    sessionId: { type: String, default: null },
  },
  { timestamps: true },
);

ownerAnalyticsEventSchema.index({
  entityType: 1,
  entityId: 1,
  eventType: 1,
  createdAt: -1,
});
ownerAnalyticsEventSchema.index({ createdAt: -1 });

module.exports = mongoose.model("OwnerAnalyticsEvent", ownerAnalyticsEventSchema);
