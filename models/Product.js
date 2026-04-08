const mongoose = require("mongoose");

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
      required: true,
    },
    storeTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StoreType",
      required: true,
    },
    categoryTypeId: {
      type: String, // This will store the type ID within the category
      required: true,
    },
    image: { type: String, required: false },
    previousPrice: { type: Number },
    newPrice: { type: Number },
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
    // User tracking fields
    viewCount: { type: Number, default: 0 },
    likeCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Product", productSchema);
