const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const { uploadImage } = require("../utils/imageUpload");
const {
  getGifts,
  getGiftById,
  getGiftsByStore,
  getGiftsByBrand,
  createGift,
  updateGift,
  deleteGift,
} = require("../controllers/giftController");

// Get all gifts
router.get("/", getGifts);

// Get gifts by store
router.get("/store/:storeId", getGiftsByStore);

// Get gifts by brand
router.get("/brand/:brandId", getGiftsByBrand);

// Create new gift
router.post("/", createGift);

// Upload gift image
router.post("/upload-image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const { url: imageUrl, urls } = await uploadImage(req.file, "gifts");
    res.json({
      imageUrl,
      ...(urls ? { urls } : {}),
      filename: req.file.filename || "",
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error uploading file", error: error.message });
  }
});

// Get gift by ID
router.get("/:id", getGiftById);

// Update gift
router.put("/:id", updateGift);

// Delete gift
router.delete("/:id", deleteGift);

module.exports = router;
