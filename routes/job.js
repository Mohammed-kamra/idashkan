const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const { protect } = require("../middleware/auth");
const {
  getJobs,
  getJobsAdmin,
  createJob,
  updateJob,
  deleteJob,
} = require("../controllers/jobController");
const { uploadImage } = require("../utils/imageUpload");

// Public list — active + non-expired only (same payload for all clients)
router.get("/", getJobs);

// Full job list for admin data entry (requires auth + admin email)
router.get("/admin", protect, getJobsAdmin);

// Admin CRUD
router.post("/", protect, createJob);
router.put("/:id", protect, updateJob);
router.delete("/:id", protect, deleteJob);

// Image upload (admin)
router.post("/upload-image", protect, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const { url: fileUrl } = await uploadImage(req.file, "jobs");
    res.json({ message: "File uploaded successfully", url: fileUrl });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: "Error uploading file" });
  }
});

module.exports = router;

