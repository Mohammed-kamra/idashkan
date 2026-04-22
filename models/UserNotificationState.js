const mongoose = require("mongoose");
const auditPlugin = require("./plugins/auditPlugin");

const userNotificationStateSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    markAllReadBefore: {
      type: Date,
      required: true,
    },
    clearedBefore: {
      type: Date,
      required: false,
    },
  },
  { timestamps: true }
);

userNotificationStateSchema.plugin(auditPlugin);

module.exports = mongoose.model(
  "UserNotificationState",
  userNotificationStateSchema
);
