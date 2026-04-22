const mongoose = require("mongoose");
const auditPlugin = require("./plugins/auditPlugin");

/** One row per product view (for owner dashboard period trends). */
const productViewEventSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
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

productViewEventSchema.plugin(auditPlugin);

productViewEventSchema.index({ productId: 1, createdAt: -1 });
productViewEventSchema.index({ createdAt: -1 });

module.exports = mongoose.model("ProductViewEvent", productViewEventSchema);
