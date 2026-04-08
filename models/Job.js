const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    titleEn: { type: String, required: false, trim: true, maxlength: 120 },
    titleAr: { type: String, required: false, trim: true, maxlength: 120 },
    titleKu: { type: String, required: false, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 4000 },
    descriptionEn: { type: String, required: false, trim: true, maxlength: 4000 },
    descriptionAr: { type: String, required: false, trim: true, maxlength: 4000 },
    descriptionKu: { type: String, required: false, trim: true, maxlength: 4000 },
    gender: {
      type: String,
      enum: ["any", "male", "female"],
      default: "any",
      trim: true,
    },
    image: { type: String, default: "", trim: true },
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: "Store", default: null },
    brandId: { type: mongoose.Schema.Types.ObjectId, ref: "Brand", default: null },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
    },
    expireDate: { type: Date, default: null },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

jobSchema.pre("validate", function (next) {
  const hasStore = Boolean(this.storeId);
  const hasBrand = Boolean(this.brandId);
  const hasCompany = Boolean(this.companyId);
  const ownerCount = [hasStore, hasBrand, hasCompany].filter(Boolean).length;
  if (ownerCount !== 1) {
    return next(
      new Error(
        "Job must have exactly one owner: one of storeId, brandId, companyId",
      ),
    );
  }
  next();
});

module.exports = mongoose.model("Job", jobSchema);

