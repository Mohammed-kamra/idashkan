const express = require("express");
const router = express.Router();
const XLSX = require("xlsx");
const {
  getBrands,
  getAllBrands,
  getBrandById,
  createBrand,
  updateBrand,
  deleteBrand,
} = require("../controllers/brandController");
const upload = require("../middleware/upload");
const { uploadImage } = require("../utils/imageUpload");

// @route   GET /api/brands
// @desc    Get all brands
router.get("/", getBrands);

// @route   GET /api/brands/all
// @desc    Get all brands (including statusAll = off) - admin
router.get("/all", getAllBrands);

// @route   GET /api/brands/:id
// @desc    Get brand by ID
router.get("/:id", getBrandById);

// @route   POST /api/brands
// @desc    Add new brand
router.post("/", createBrand);

// @route   PUT /api/brands/:id
// @desc    Update brand
router.put("/:id", updateBrand);

// @route   DELETE /api/brands/:id
// @desc    Delete brand
router.delete("/:id", deleteBrand);

// @route   POST /api/brands/upload-logo
// @desc    Upload brand logo
router.post("/upload-logo", upload.single("logo"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const { url: fileUrl, urls } = await uploadImage(req.file, "brands");
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

// @route   POST /api/brands/bulk-upload
// @desc    Upload Excel file and create multiple brands
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

      // Skip empty rows
      if (!row || row.length === 0 || !row[0]) continue;

      try {
        const brandData = {
          name: row[0] || "",
          logo: row[1] || "",
          address: row[2] || "",
          phone: row[3] || "",
          description: row[4] || "",
        };

        // Validate required fields
        if (!brandData.name) {
          errors.push(`Row ${i + 2}: Missing required field (name)`);
          continue;
        }

        // Create the brand
        const Brand = require("../models/Brand");
        const newBrand = new Brand(brandData);
        await newBrand.save();
        createdCount++;
      } catch (error) {
        errors.push(`Row ${i + 2}: ${error.message}`);
      }
    }

    // Clean up the uploaded file
    const fs = require("fs");
    fs.unlinkSync(req.file.path);

    res.json({
      message: "Bulk upload completed",
      createdCount,
      errors: errors.length > 0 ? errors : null,
    });
  } catch (error) {
    console.error("Bulk upload error:", error);
    res.status(500).json({
      message: "Error processing Excel file",
      error: error.message,
    });
  }
});

module.exports = router;
