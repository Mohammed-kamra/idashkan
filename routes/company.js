const express = require("express");
const router = express.Router();
const XLSX = require("xlsx");
const {
  getCompanies,
  getAllCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
} = require("../controllers/companyController");
const upload = require("../middleware/upload");
const { uploadImage } = require("../utils/imageUpload");

router.get("/", getCompanies);
router.get("/all", getAllCompanies);
router.get("/:id", getCompanyById);
router.post("/", createCompany);
router.put("/:id", updateCompany);
router.delete("/:id", deleteCompany);

router.post("/upload-logo", upload.single("logo"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const { url: fileUrl } = await uploadImage(req.file, "companies");
    res.json({ message: "File uploaded successfully", url: fileUrl });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: "Error uploading file" });
  }
});

router.post("/bulk-upload", upload.single("excelFile"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No Excel file uploaded" });
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    const rows = data.slice(1);

    let createdCount = 0;
    const errors = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0 || !row[0]) continue;
      try {
        const companyData = {
          name: row[0] || "",
          logo: row[1] || "",
          address: row[2] || "",
          phone: row[3] || "",
          description: row[4] || "",
        };
        if (!companyData.name) {
          errors.push(`Row ${i + 2}: Missing required field (name)`);
          continue;
        }
        const Company = require("../models/Company");
        const newCompany = new Company(companyData);
        await newCompany.save();
        createdCount++;
      } catch (error) {
        errors.push(`Row ${i + 2}: ${error.message}`);
      }
    }
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
