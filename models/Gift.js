const mongoose = require("mongoose");

const giftSchema = new mongoose.Schema(
  {
    image: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    descriptionEn: { type: String, required: false },
    descriptionAr: { type: String, required: false },
    descriptionKu: { type: String, required: false },
    storeId: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Store",
        required: false,
      },
    ],
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
    productId: {
      type: String, // Product barcode
      required: false,
    },
    expireDate: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Gift", giftSchema);
