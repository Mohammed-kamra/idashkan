const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
require("dotenv").config();

const User = require("./models/User");

const app = express();

// Debug environment variables
console.log("Environment variables:");
console.log("MONGO_URI:", process.env.MONGO_URI || "Using default");
console.log("PORT:", process.env.PORT);

// Connect Database
if (!process.env.MONGO_URI) {
  console.log("MONGO_URI not found in environment, using default connection");
  process.env.MONGO_URI = "mongodb://localhost:27017/storeplace";
}

connectDB();

mongoose.connection.once("open", async () => {
  try {
    const { seedCitiesIfEmpty } = require("./controllers/cityController");
    await seedCitiesIfEmpty();
  } catch (e) {
    console.error("[migration] cities:", e.message);
  }
  try {
    const result = await User.updateMany(
      {
        $or: [
          { role: { $exists: false } },
          { role: null },
          { role: "" },
        ],
      },
      { $set: { role: "user" } },
    );
    if (result.modifiedCount > 0) {
      console.log(
        `[migration] Default role=user applied to ${result.modifiedCount} user document(s)`,
      );
    }
  } catch (e) {
    console.error("[migration] user role:", e.message);
  }
});

// Middleware - CORS: allow known frontends + localhost; mobile needs explicit origins
const allowedOrigins = [
  "http://localhost:3000",
  "https://dashkan.net",
  "https://www.dashkan.net",
  "https://idiscount.vercel.app",
];
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin) || origin.endsWith(".vercel.app"))
        return cb(null, true);
      return cb(null, true);
    },
    credentials: true,
  })
);
app.use(express.json());

// Serve static files from uploads directory
app.use("/uploads", express.static("uploads"));

// Health check (used for keep-alive / monitoring)
app.get("/health", (req, res) => {
  res.status(200).json({
    ok: true,
    ts: new Date().toISOString(),
  });
});

// Routes
app.use("/api/stores", require("./routes/store"));
app.use("/api/brands", require("./routes/brand"));
app.use("/api/companies", require("./routes/company"));
app.use("/api/products", require("./routes/product"));
app.use("/api/categories", require("./routes/category"));
app.use("/api/gifts", require("./routes/gift"));
app.use("/api/users", require("./routes/user"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/ads", require("./routes/ad"));
app.use("/api/cities", require("./routes/city"));
app.use("/api/store-types", require("./routes/storeType"));
app.use("/api/brand-types", require("./routes/brandType"));
app.use("/api/notifications", require("./routes/notification"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/settings", require("./routes/settings"));
app.use("/api/theme", require("./routes/theme"));
app.use("/api/search", require("./routes/search"));
app.use("/api/search-analytics", require("./routes/searchAnalytics"));
app.use("/api/videos", require("./routes/video"));
app.use("/api/jobs", require("./routes/job"));
app.use("/api/translations", require("./routes/translation"));
app.use("/api/ai", require("./routes/ai"));
app.use("/api/owner-dashboard", require("./routes/ownerDashboard"));
app.use("/api/owner-analytics", require("./routes/ownerAnalytics"));
app.use("/api/cart-orders", require("./routes/cartOrders"));

const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server started on http://0.0.0.0:${PORT}`);
  // Run job to delete deactivated users past grace period (every 24h)
  const deleteDeactivatedUsers = require("./jobs/deleteDeactivatedUsers");
  setInterval(() => deleteDeactivatedUsers.run().catch((e) => console.error("[deleteDeactivatedUsers]", e.message)), 24 * 60 * 60 * 1000);
  deleteDeactivatedUsers.run().catch((e) => console.error("[deleteDeactivatedUsers]", e.message));
});

// Debug message for frontend
console.log("Compiled successfully!");
console.log("You can now view frontend in the browser.");
console.log("Local: http://localhost:3000");
