const express = require("express");
const router = express.Router();
const {
  getUserByDevice,
  toggleProductLike,
  toggleVideoLike,
  toggleFollowStore,
  recordProductView,
  getLikedProducts,
  getViewedProducts,
  getFollowedStores,
  updateDeviceProfile,
} = require("../controllers/userController");
const { pushSubscribe } = require("../controllers/pushController");
// optionalAuth is applied globally in server.js (Bearer → req.user + audit fields)

// Public routes (for anonymous users)
router.get("/device/:deviceId", getUserByDevice);
router.post("/view-product", recordProductView);
router.post("/push-subscribe", pushSubscribe);

// Like/product routes - work with auth OR deviceId (anonymous)
router.post("/like-product", toggleProductLike);
router.post("/like-video", toggleVideoLike);
router.post("/follow-store", toggleFollowStore);
router.get("/liked-products", getLikedProducts);
router.get("/followed-stores", getFollowedStores);
router.get("/viewed-products", getViewedProducts);
router.put("/device-profile", updateDeviceProfile);

module.exports = router;
