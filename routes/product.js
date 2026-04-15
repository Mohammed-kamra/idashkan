const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const XLSX = require("xlsx");
const Store = require("../models/Store");
const { uploadImage } = require("../utils/imageUpload");
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductsByBrand,
  getProductsByCompany,
  getProductsByStore,
  getProductsByCategory,
  getCategories,
} = require("../controllers/productController");

// @route   GET /api/products
// @desc    Get all products (with optional filters)

router.get("/", getProducts);

// @route   GET /api/products/categories
// @desc    Get all categories
router.get("/categories", getCategories);

// @route   GET /api/products/brand/:brandId
// @desc    Get products by brand
router.get("/brand/:brandId", getProductsByBrand);
router.get("/company/:companyId", getProductsByCompany);

// @route   GET /api/products/store/:storeId
// @desc    Get products by store
router.get("/store/:storeId", getProductsByStore);

// @route   GET /api/products/category/:category
// @desc    Get products by category
router.get("/category/:category", getProductsByCategory);

// @route   GET /api/products/:id
// @desc    Get product by ID
router.get("/:id", getProductById);

// @route   POST /api/products
// @desc    Add new product
router.post("/", createProduct);

// @route   PUT /api/products/:id
// @desc    Update product
router.put("/:id", updateProduct);

// @route   DELETE /api/products/:id
// @desc    Delete product
router.delete("/:id", deleteProduct);

// @route   POST /api/products/upload-image
// @desc    Upload product image
router.post("/upload-image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const expireDate = req.body?.expireDate;
    const { url: imageUrl } = await uploadImage(req.file, "products", {
      expireDate,
    });
    res.json({
      imageUrl,
      filename: req.file.filename || "",
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error uploading file", error: error.message });
  }
});

// @route   POST /api/products/bulk-upload
// @desc    Upload Excel file and create multiple products
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

    // Validate header (show user exact expected format)
    const header = Array.isArray(data[0]) ? data[0].map((c) => String(c || "").trim()) : [];
    const expected = [
      "Barcode",
      "Name",
      "Category ID",
      "Category Type ID",
      "Previous Price",
      "New Price",
      "Is Discount",
      "Brand ID",
      "Store ID",
      "Description",
      "Expire Date",
      "Weight",
      "Store Type (optional name)",
    ];
    const normalize = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
    const expectedNorm = expected.map(normalize);
    const headerNorm = header.map(normalize);
    const looksLikeTemplate =
      headerNorm.length >= 12 &&
      expectedNorm.slice(0, 12).every((v, idx) => headerNorm[idx] === v);

    if (!looksLikeTemplate) {
      // Still allow "no header" files (if first row is data); otherwise explain mismatch
      const maybeDataRow = Array.isArray(data[0]) ? data[0] : [];
      const seemsNoHeader = maybeDataRow.length >= 9 && (typeof maybeDataRow[1] === "string" || typeof maybeDataRow[1] === "number");
      if (!seemsNoHeader) {
        return res.status(400).json({
          message:
            "Excel header format is not correct. Please download the template and do not rename/reorder columns.",
          expectedHeader: expected,
          receivedHeader: header,
        });
      }
    }

    // Remove header row if it exists
    const rows = looksLikeTemplate ? data.slice(1) : data;

    let bulkStoreIds = [];
    try {
      if (req.body.storeIds) {
        const parsed = JSON.parse(req.body.storeIds);
        if (Array.isArray(parsed)) {
          bulkStoreIds = parsed.map(String).filter(Boolean);
        }
      }
    } catch (e) {
      /* ignore invalid JSON */
    }

    let createdCount = 0;
    const errors = [];

    const Product = require("../models/Product");
    const StoreType = require("../models/StoreType");

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      // Skip only fully-empty rows (do NOT require barcode in col A)
      const hasAnyValue =
        Array.isArray(row) &&
        row.some((cell) => String(cell ?? "").trim().length > 0);
      if (!hasAnyValue) continue;

      try {
        const rowStoreId =
          row[8] != null && String(row[8]).trim() !== ""
            ? String(row[8]).trim()
            : "";
        const storesForRow =
          bulkStoreIds.length > 0
            ? bulkStoreIds
            : rowStoreId
              ? [rowStoreId]
              : [];

        if (storesForRow.length === 0) {
          errors.push(
            `Row ${
              i + 2
            }: Select store(s) in the upload dialog or enter Store ID in column I`,
          );
          continue;
        }

        const baseProductData = {
          barcode: row[0] || "",
          name: row[1] || "",
          categoryId: row[2] || "",
          categoryTypeId: row[3] || "",
          previousPrice: row[4] ? parseFloat(row[4]) : null,
          newPrice: row[5] ? parseFloat(row[5]) : null,
          isDiscount: row[6] === "true" || row[6] === "1" || row[6] === true,
          brandId: row[7] || "",
          description: row[9] || "",
          expireDate: row[10] ? new Date(row[10]).toISOString() : null,
          weight: row[11] || "",
          status: "pending",
        };

        if (
          !baseProductData.name ||
          baseProductData.isDiscount === undefined ||
          !baseProductData.categoryId ||
          !baseProductData.categoryTypeId
        ) {
          errors.push(
            `Row ${
              i + 2
            }: Missing required fields (name, isDiscount, categoryId, categoryTypeId)`,
          );
          continue;
        }

        let storeTypeFromColumn = null;
        if (row[12]) {
          const st = await StoreType.findOne({ name: row[12] });
          if (st) storeTypeFromColumn = st._id;
        }

        for (const sid of storesForRow) {
          const productData = {
            ...baseProductData,
            storeId: sid,
          };

          if (storeTypeFromColumn) {
            productData.storeTypeId = storeTypeFromColumn;
          }

          if (!productData.storeTypeId && sid) {
            const storeDoc = await Store.findById(sid).select("storeTypeId");
            if (!storeDoc) {
              errors.push(
                `Row ${i + 2}: Store not found for storeId ${sid}`,
              );
              continue;
            }
            if (!storeDoc.storeTypeId) {
              errors.push(
                `Row ${i + 2}: storeTypeId is missing on store (${sid})`,
              );
              continue;
            }
            productData.storeTypeId = storeDoc.storeTypeId;
          }

          const newProduct = new Product(productData);
          await newProduct.save();
          await Store.findByIdAndUpdate(sid, {
            $set: { lastReleaseDiscountDate: new Date() },
          });
          createdCount++;
        }
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
