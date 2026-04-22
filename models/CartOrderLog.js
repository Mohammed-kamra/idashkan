const mongoose = require("mongoose");
const auditPlugin = require("./plugins/auditPlugin");

const cartOrderItemSchema = new mongoose.Schema(
  {
    productId: { type: String, default: "" },
    qty: { type: Number, default: 0, min: 0 },
    productName: { type: String, default: "" },
  },
  { _id: false },
);

const cartOrderLogSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true,
    },
    storeName: { type: String, default: "" },
    /** Snapshots for admin search in any locale (plus Store lookup on list). */
    storeNamePrimary: { type: String, default: "" },
    storeNameEn: { type: String, default: "" },
    storeNameAr: { type: String, default: "" },
    storeNameKu: { type: String, default: "" },
    orderId: { type: String, required: true, trim: true },
    items: { type: [cartOrderItemSchema], default: [] },
    messageText: { type: String, default: "" },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    sessionId: { type: String, default: null },
  },
  { timestamps: true },
);

cartOrderLogSchema.plugin(auditPlugin);

cartOrderLogSchema.index({ createdAt: -1 });
cartOrderLogSchema.index({ storeId: 1, createdAt: -1 });

module.exports = mongoose.model("CartOrderLog", cartOrderLogSchema);
