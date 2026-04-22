const mongoose = require("mongoose");
const auditPlugin = require("./plugins/auditPlugin");

const adSchema = new mongoose.Schema(
  {
    image: { type: String, required: true },
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
    giftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Gift",
      required: false,
    },
    // New optional fields
    startDate: { type: Date },
    endDate: { type: Date },
    linkUrl: { type: String },
    active: { type: Boolean, default: true },
    priority: { type: Number, default: 0 },
    pages: [
      {
        type: String,
        enum: ["all", "home", "brands", "stores", "gifts"],
        default: undefined,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Helpful compound index for common querying/sorting patterns
adSchema.index({ active: 1, pages: 1, startDate: 1, endDate: 1, priority: -1 });

adSchema.plugin(auditPlugin);

module.exports = mongoose.model("Ad", adSchema);
