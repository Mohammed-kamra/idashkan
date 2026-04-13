const mongoose = require("mongoose");

const storeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  nameEn: { type: String, required: false },
  nameAr: { type: String, required: false },
  nameKu: { type: String, required: false },
  logo: { type: String },
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
  storeTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "StoreType",
    required: true,
  },
  storecity: {
    type: String,
    required: true,
    trim: true,
  },
  isVip: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  expireDate: { type: Date, default: null },
  statusAll: {
    type: String,
    enum: ["on", "off"],
    default: "on",
  },
  branches: [
    {
      name: { type: String },
      storeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Store",
        required: false,
      },
    },
  ],
  show: { type: Boolean, default: true },
  followerCount: { type: Number, default: 0 },
  lastReleaseDiscountDate: { type: Date, default: null },
  isHasDelivery: { type: Boolean, default: false },
  /** When true, delivery is offered in every city (subject to city filter UI). */
  deliveryAllCities: { type: Boolean, default: false },
  /** City names (same as `storecity` values) where this store delivers when not all cities. */
  deliveryCities: [{ type: String, trim: true }],
});

module.exports = mongoose.model("Store", storeSchema);
