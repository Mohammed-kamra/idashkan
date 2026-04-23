const mongoose = require("mongoose");
const auditPlugin = require("./plugins/auditPlugin");

const settingsSchema = new mongoose.Schema(
  {
    activeTheme: {
      type: String,
      default: "default",
      trim: true,
    },
    activeFontKey: {
      type: String,
      default: "default",
      trim: true,
    },
    navConfig: {
      template: { type: String, default: "template1", trim: true },
      topSlots: {
        topleft1: { type: String, default: "", trim: true },
        topleft2: { type: String, default: "", trim: true },
        center: { type: String, default: "label", trim: true },
        topright1: { type: String, default: "", trim: true },
        topright2: { type: String, default: "", trim: true },
        topright3: { type: String, default: "", trim: true },
      },
      bottomSlots: {
        bottomleft1: { type: String, default: "home", trim: true },
        bottomleft2: { type: String, default: "categories", trim: true },
        center: { type: String, default: "reels", trim: true },
        bottomright1: { type: String, default: "favourites", trim: true },
        bottomright2: { type: String, default: "profile", trim: true },
      },
    },
    /** Ordered app page ids shown as shortcuts on Profile (admin via theme API). */
    profileShortcuts: {
      type: [String],
      default: undefined,
    },
    contactWhatsAppNumber: {
      type: String,
      default: "+9647503683478",
      trim: true,
    },
    contactInfo: {
      whatsapp: { type: String, default: "", trim: true },
      facebook: { type: String, default: "", trim: true },
      instagram: { type: String, default: "", trim: true },
      snapchat: { type: String, default: "", trim: true },
      gmail: { type: String, default: "", trim: true },
      tiktok: { type: String, default: "", trim: true },
      viber: { type: String, default: "", trim: true },
      telegram: { type: String, default: "", trim: true },
    },
  },
  { timestamps: true }
);

settingsSchema.plugin(auditPlugin);

// Single document - use "app" as the only settings doc id
module.exports = mongoose.model("Settings", settingsSchema);
