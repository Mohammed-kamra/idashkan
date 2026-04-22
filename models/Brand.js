const mongoose = require("mongoose");
const auditPlugin = require("./plugins/auditPlugin");

const brandSchema = new mongoose.Schema(
  {
  name: { type: String, required: true },
  nameEn: { type: String, required: false },
  nameAr: { type: String, required: false },
  nameKu: { type: String, required: false },
  logo: { type: String },
  brandTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "BrandType",
    required: false,
  },
  address: { type: String },
  addressEn: { type: String, required: false },
  addressAr: { type: String, required: false },
  addressKu: { type: String, required: false },
  phone: { type: String },
  contactInfo: {
    phone: { type: String, default: "" },
    whatsapp: { type: String, default: "" },
    facebook: { type: String, default: "" },
    instagram: { type: String, default: "" },
    tiktok: { type: String, default: "" },
    snapchat: { type: String, default: "" },
  },
  locationInfo: {
    googleMaps: { type: String, default: "" },
    appleMaps: { type: String, default: "" },
    waze: { type: String, default: "" },
  },
  description: { type: String },
  descriptionEn: { type: String, required: false },
  descriptionAr: { type: String, required: false },
  descriptionKu: { type: String, required: false },
  isVip: { type: Boolean, default: false },
  expireDate: { type: Date, default: null },
  statusAll: {
    type: String,
    enum: ["on", "off"],
    default: "on",
  },
  /** Physical location city (same values as store `storecity`). */
  storecity: { type: String, trim: true, default: "Erbil" },
  isHasDelivery: { type: Boolean, default: false },
  deliveryAllCities: { type: Boolean, default: false },
  deliveryCities: [{ type: String, trim: true }],
  /** Denormalized follower count (store parity; increment when brand-follow exists). */
  followerCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

brandSchema.plugin(auditPlugin);

module.exports = mongoose.model("Brand", brandSchema);
