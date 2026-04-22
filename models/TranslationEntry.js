const mongoose = require("mongoose");
const auditPlugin = require("./plugins/auditPlugin");

const translationEntrySchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      maxlength: 10000,
    },
    en: { type: String, default: "" },
    ar: { type: String, default: "" },
    ku: { type: String, default: "" },
  },
  { timestamps: true },
);

translationEntrySchema.plugin(auditPlugin);

module.exports = mongoose.model("TranslationEntry", translationEntrySchema);
