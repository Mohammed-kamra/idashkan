const mongoose = require("mongoose");
const auditPlugin = require("./plugins/auditPlugin");

const notificationReadSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    notificationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BroadcastNotification",
      required: true,
      index: true,
    },
    readAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

notificationReadSchema.plugin(auditPlugin);

notificationReadSchema.index(
  { userId: 1, notificationId: 1 },
  { unique: true }
);

module.exports = mongoose.model("NotificationRead", notificationReadSchema);
