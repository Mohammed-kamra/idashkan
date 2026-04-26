const mongoose = require("mongoose");
const auditPlugin = require("./plugins/auditPlugin");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    nameEn: { type: String, required: false },
    nameAr: { type: String, required: false },
    nameKu: { type: String, required: false },
    description: { type: String, required: false },
    descriptionEn: { type: String, required: false },
    descriptionAr: { type: String, required: false },
    descriptionKu: { type: String, required: false },
    barcode: { type: String, required: false },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: false,
    },
    storeTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StoreType",
      required: false,
    },
    categoryTypeId: {
      type: String, // This will store the type ID within the category
      required: false,
    },
    image: { type: String, required: false },
    previousPrice: { type: Number, min: 0 },
    newPrice: { type: Number, min: 0 },
    isDiscount: { type: Boolean, default: false },
    weight: { type: String },
    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      required: false,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: false,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: false,
    },
    expireDate: { type: Date },
    status: {
      type: String,
      enum: ["published", "pending"],
      default: "published",
      index: true,
    },
    /** When status is pending: first-time moderation vs revision after publish. */
    pendingReason: {
      type: String,
      enum: ["adding", "editing"],
      default: null,
    },
    /** Set true the first time (and stays true) after a product is published. */
    wasEverPublished: { type: Boolean, default: false },
    /**
     * Proposed field changes from owner data entry (etc.) while `status` stays `published`.
     * Applied to root fields when admin/support approves (publish).
     */
    pendingDraft: { type: mongoose.Schema.Types.Mixed, default: null },
    /** Moderation audit fields (set when pending gets approved/published). */
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedAt: { type: Date, default: null },
    // User tracking fields
    viewCount: { type: Number, default: 0 },
    likeCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

productSchema.plugin(auditPlugin);

module.exports = mongoose.model("Product", productSchema);
