const mongoose = require("mongoose");
const auditPlugin = require("./plugins/auditPlugin");

/** One row per like action (for owner dashboard period rankings). */
const productLikeEventSchema = new mongoose.Schema(
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
  },
  { timestamps: true },
);

productLikeEventSchema.plugin(auditPlugin);

productLikeEventSchema.index({ productId: 1, createdAt: -1 });
productLikeEventSchema.index({ createdAt: -1 });

module.exports = mongoose.model("ProductLikeEvent", productLikeEventSchema);
