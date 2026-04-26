const express = require("express");
const router = express.Router();
const {
  getAds,
  getAdById,
  createAd,
  updateAd,
  deleteAd,
} = require("../controllers/adController");
const upload = require("../middleware/upload");
const { uploadImage } = require("../utils/imageUpload");

// @route   GET /api/ads
// @desc    Get all ads
router.get("/", getAds);

// @route   GET /api/ads/:id
// @desc    Get ad by ID
router.get("/:id", getAdById);

// @route   POST /api/ads
// @desc    Create new ad
router.post("/", createAd);

// @route   PUT /api/ads/:id
// @desc    Update ad
router.put("/:id", updateAd);

// @route   DELETE /api/ads/:id
// @desc    Delete ad
router.delete("/:id", deleteAd);

// @route   POST /api/ads/upload-image
// @desc    Upload ad image
router.post("/upload-image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const { url: fileUrl, urls } = await uploadImage(req.file, "ads");
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

module.exports = router;
