const mongoose = require("mongoose");
const auditPlugin = require("./plugins/auditPlugin");

const citySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    flag: { type: String, default: "📍" },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

citySchema.plugin(auditPlugin);

module.exports = mongoose.model("City", citySchema);
