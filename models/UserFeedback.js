const mongoose = require("mongoose");
const auditPlugin = require("./plugins/auditPlugin");

const userFeedbackSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["suggestion", "problem"],
      required: true,
      index: true,
    },
    note: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    status: {
      type: String,
      enum: ["new", "reviewed"],
      default: "new",
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    guestDeviceId: {
      type: String,
      default: null,
      index: true,
    },
    guestName: {
      type: String,
      default: null,
    },
    email: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

userFeedbackSchema.plugin(auditPlugin);
userFeedbackSchema.index({ createdAt: -1 });

module.exports = mongoose.model("UserFeedback", userFeedbackSchema);
