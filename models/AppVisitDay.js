const mongoose = require("mongoose");
const auditPlugin = require("./plugins/auditPlugin");

const appVisitDaySchema = new mongoose.Schema(
  {
    day: {
      type: String,
      required: true,
      index: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    visitSessionId: {
      type: String,
      required: true,
      trim: true,
    },
    visitorKey: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    deviceId: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

appVisitDaySchema.plugin(auditPlugin);

appVisitDaySchema.index({ day: 1, visitSessionId: 1 }, { unique: true });

module.exports = mongoose.model("AppVisitDay", appVisitDaySchema);
