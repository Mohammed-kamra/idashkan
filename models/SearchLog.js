const mongoose = require("mongoose");

const filtersSchema = new mongoose.Schema(
  {
    category: { type: String, default: null },
    city: { type: String, default: null },
    store: { type: String, default: null },
    sortBy: { type: String, default: null },
    priceMin: { type: Number, default: null },
    priceMax: { type: Number, default: null },
  },
  { _id: false },
);

const searchLogSchema = new mongoose.Schema(
  {
    searchText: { type: String, required: true, trim: true },
    normalizedSearchText: { type: String, required: true, index: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    searchedAt: { type: Date, default: Date.now, index: true },
    filters: { type: filtersSchema, default: () => ({}) },
    resultCount: { type: Number, default: 0, min: 0 },
    clickedResult: { type: Boolean, default: false, index: true },
    clickedResultId: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    clickedResultType: { type: String, default: null },
    deviceType: {
      type: String,
      enum: ["mobile", "tablet", "desktop", "unknown"],
      default: "unknown",
    },
    source: {
      type: String,
      enum: ["mainpage", "searchpage"],
      required: true,
      index: true,
    },
    sessionId: { type: String, default: null, index: true },
    ipHash: { type: String, default: null, index: true },
  },
  { timestamps: true },
);

searchLogSchema.index({ normalizedSearchText: 1, searchedAt: -1 });
searchLogSchema.index({ searchedAt: -1 });
searchLogSchema.index({ "filters.city": 1, searchedAt: -1 });
searchLogSchema.index({ "filters.category": 1, searchedAt: -1 });
searchLogSchema.index({ "filters.store": 1, searchedAt: -1 });
searchLogSchema.index({ source: 1, searchedAt: -1 });
searchLogSchema.index({ clickedResult: 1, searchedAt: -1 });
searchLogSchema.index({ resultCount: 1, searchedAt: -1 });

module.exports = mongoose.model("SearchLog", searchLogSchema);
