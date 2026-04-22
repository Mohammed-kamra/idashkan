const mongoose = require("mongoose");
const auditPlugin = require("./plugins/auditPlugin");

const brandTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    nameEn: { type: String, required: false, trim: true },
    nameAr: { type: String, required: false, trim: true },
    nameKu: { type: String, required: false, trim: true },
    icon: { type: String, required: false, trim: true },
  },
  { timestamps: true }
);

brandTypeSchema.plugin(auditPlugin);

module.exports = mongoose.model("BrandType", brandTypeSchema);
