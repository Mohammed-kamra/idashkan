const mongoose = require("mongoose");
const auditPlugin = require("./plugins/auditPlugin");

const storeTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    nameEn: { type: String, required: false, trim: true },
    nameAr: { type: String, required: false, trim: true },
    nameKu: { type: String, required: false, trim: true },
    icon: { type: String, required: false, trim: true }, // optional emoji or icon text
  },
  { timestamps: true }
);

storeTypeSchema.plugin(auditPlugin);

module.exports = mongoose.model("StoreType", storeTypeSchema);
