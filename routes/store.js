const express = require("express");
const router = express.Router();
const XLSX = require("xlsx");
const {
  getStores,
  getVisibleStores,
  getStoreById,
  createStore,
  updateStore,
  deleteStore,
} = require("../controllers/storeController");
const upload = require("../middleware/upload");
const { uploadImage } = require("../utils/imageUpload");

// @route   GET /api/stores
// @desc    Get all stores (including hidden ones)
router.get("/", getStores);

// @route   GET /api/stores/visible
// @desc    Get only visible stores (for store list page)
router.get("/visible", getVisibleStores);

// @route   GET /api/stores/all
// @desc    Get all stores (including hidden ones) - for admin
router.get("/all", async (req, res) => {
  try {
    const Store = require("../models/Store");
    const stores = await Store.find()
      .populate("storeTypeId", "name icon")
      .sort({ isVip: -1, name: 1 });
    res.json(stores);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   POST /api/stores
// @desc    Add new store
router.post("/", createStore);

// @route   POST /api/stores/upload-logo
// @desc    Upload store logo
router.post("/upload-logo", upload.single("logo"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const { url: fileUrl, urls } = await uploadImage(req.file, "stores");
    res.json({
      message: "File uploaded successfully",
      url: fileUrl,
      ...(urls ? { urls } : {}),
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: "Error uploading file" });
  }
});

// @route   POST /api/stores/bulk-upload
// @desc    Upload Excel file and create multiple stores
router.post("/bulk-upload", upload.single("excelFile"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No Excel file uploaded" });
    }

    // Read the Excel file
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Remove header row if it exists
    const rows = data.slice(1);

    let createdCount = 0;
    const errors = [];

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row[0]) continue; // Skip empty rows

      try {
        const storeData = {
          name: row[0] || "",
          logo: row[1] || "",
          address: row[2] || "",
          phone: row[3] || "",
          description: row[4] || "",
          storecity: row[5] || "Erbil", // Default to Erbil if not provided
          show: row[6] !== undefined ? row[6] === "true" : true,
          branches: row[7] ? JSON.parse(row[7]) : [],
        };

        const store = new Store(storeData);
        await store.save();
        createdCount++;
      } catch (error) {
        errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }

    res.json({
      message: `Successfully created ${createdCount} stores`,
      createdCount,
      errors,
    });
  } catch (error) {
    console.error("Bulk upload error:", error);
    res.status(500).json({ message: "Error processing bulk upload" });
  }
});

// @route   PUT /api/stores/:id/toggle-visibility
// @desc    Toggle store visibility
router.put("/:id/toggle-visibility", async (req, res) => {
  try {
    const Store = require("../models/Store");
    const store = await Store.findById(req.params.id);
    if (!store) return res.status(404).json({ msg: "Store not found" });

    store.show = !store.show;
    await store.save();

    const populated = await Store.findById(store._id).populate(
      "storeTypeId",
      "name icon"
    );
    res.json(populated);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   GET /api/stores/:id
// @desc    Get store by ID
router.get("/:id", getStoreById);

// @route   PUT /api/stores/:id
// @desc    Update store
router.put("/:id", updateStore);

// @route   DELETE /api/stores/:id
// @desc    Delete store
router.delete("/:id", deleteStore);

module.exports = router;
