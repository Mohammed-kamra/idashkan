const mongoose = require("mongoose");
const User = require("../models/User");
const ProductViewEvent = require("../models/ProductViewEvent");
const ProductLikeEvent = require("../models/ProductLikeEvent");
const Product = require("../models/Product");
const Store = require("../models/Store");
const Video = require("../models/Video");
const { categoryList, storeList, brandList } = require("../utils/refPopulate");

// @desc    Get or create user by device ID (for anonymous tracking)
// @route   GET /api/users/device/:deviceId
// @access  Public
const getUserByDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;

    // Find user by deviceId (don't populate - we need raw IDs for like state checks)
    let user = await User.findOne({ deviceId });

    if (!user) {
      user = new User({ deviceId });
      await user.save();
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error("Error getting user by device:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Like/unlike a product (works with auth token OR deviceId for anonymous)
// @route   POST /api/users/like-product
// @access  Public (optionalAuth - supports both logged-in and anonymous users)
const toggleProductLike = async (req, res) => {
  try {
    const { productId, deviceId } = req.body;
    const userId = req.userId;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    let user;
    if (userId) {
      user = await User.findById(userId);
    } else if (deviceId) {
      user = await User.findOne({ deviceId });
      if (!user) {
        user = new User({ deviceId });
        await user.save();
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "Either login or provide device ID to like products",
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Compare as strings (productId from body is string; likedProducts may be ObjectIds)
    const isLiked = user.likedProducts.some(
      (id) => id.toString() === productId || id === productId,
    );

    let updatedProduct;
    if (isLiked) {
      // Unlike
      user.likedProducts = user.likedProducts.filter(
        (id) => id.toString() !== productId,
      );
      updatedProduct = await Product.findByIdAndUpdate(
        productId,
        { $inc: { likeCount: -1 } },
        { new: true },
      );
      // Ensure like count doesn't go below 0
      if (updatedProduct.likeCount < 0) {
        updatedProduct = await Product.findByIdAndUpdate(
          productId,
          { likeCount: 0 },
          { new: true },
        );
      }
    } else {
      // Like
      user.likedProducts.push(productId);
      updatedProduct = await Product.findByIdAndUpdate(
        productId,
        { $inc: { likeCount: 1 } },
        { new: true },
      );
      try {
        await ProductLikeEvent.create({
          productId,
          userId: userId || null,
        });
      } catch (e) {
        console.error("ProductLikeEvent create:", e?.message || e);
      }
    }

    await user.save();

    res.json({
      success: true,
      data: {
        isLiked: !isLiked,
        likeCount: updatedProduct.likeCount,
      },
    });
  } catch (error) {
    console.error("Error toggling product like:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Like/unlike a video reel (works with auth token OR deviceId for anonymous)
// @route   POST /api/users/like-video
// @access  Public (optionalAuth)
const toggleVideoLike = async (req, res) => {
  try {
    const { videoId, deviceId } = req.body;
    const userId = req.userId;

    if (!videoId) {
      return res.status(400).json({
        success: false,
        message: "Video ID is required",
      });
    }

    let user;
    if (userId) {
      user = await User.findById(userId);
    } else if (deviceId) {
      user = await User.findOne({ deviceId });
      if (!user) {
        user = new User({ deviceId });
        await user.save();
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "Either login or provide device ID to like videos",
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    const likedVideos = user.likedVideos || [];
    const isLiked = likedVideos.some(
      (id) => id.toString() === videoId || id === videoId,
    );

    let updatedVideo;
    if (isLiked) {
      user.likedVideos = likedVideos.filter((id) => id.toString() !== videoId);
      updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        { $inc: { like: -1 } },
        { new: true },
      );
      if (updatedVideo.like < 0) {
        updatedVideo = await Video.findByIdAndUpdate(
          videoId,
          { like: 0 },
          { new: true },
        );
      }
    } else {
      user.likedVideos.push(videoId);
      updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        { $inc: { like: 1 } },
        { new: true },
      );
    }

    await user.save();

    return res.json({
      success: true,
      data: {
        isLiked: !isLiked,
        likeCount: updatedVideo.like,
      },
    });
  } catch (error) {
    console.error("Error toggling video like:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Record product view (works for both authenticated and anonymous users)
// @route   POST /api/users/view-product
// @access  Public
const recordProductView = async (req, res) => {
  try {
    const { deviceId, productId } = req.body;
    const userId = req.userId; // From optional auth middleware

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    // For authenticated users, use their account
    // For anonymous users, use device ID
    let user;
    if (userId) {
      user = await User.findById(userId);
    } else if (deviceId) {
      user = await User.findOne({ deviceId });
      if (!user) {
        user = new User({ deviceId });
        await user.save();
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "Either user authentication or device ID is required",
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Update product view count using findByIdAndUpdate to avoid validation issues
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { $inc: { viewCount: 1 } },
      { new: true },
    );

    try {
      await ProductViewEvent.create({
        productId,
        userId: userId || null,
        sessionId: req.body?.sessionId
          ? String(req.body.sessionId).slice(0, 128)
          : null,
      });
    } catch (e) {
      console.warn("ProductViewEvent:", e.message);
    }

    // Update user's viewed products atomically (avoids VersionError when concurrent
    // view requests race on the same User document).
    const uid = user._id;
    const pid =
      product._id instanceof mongoose.Types.ObjectId
        ? product._id
        : new mongoose.Types.ObjectId(String(productId));
    const now = new Date();

    let r = await User.updateOne(
      { _id: uid, "viewedProducts.productId": pid },
      {
        $inc: { "viewedProducts.$.viewCount": 1 },
        $set: { "viewedProducts.$.lastViewed": now },
      },
    );

    if (r.modifiedCount === 0) {
      r = await User.updateOne(
        {
          _id: uid,
          $nor: [{ viewedProducts: { $elemMatch: { productId: pid } } }],
        },
        {
          $push: {
            viewedProducts: {
              productId: pid,
              viewCount: 1,
              lastViewed: now,
            },
          },
        },
      );
    }

    if (r.modifiedCount === 0) {
      await User.updateOne(
        { _id: uid, "viewedProducts.productId": pid },
        {
          $inc: { "viewedProducts.$.viewCount": 1 },
          $set: { "viewedProducts.$.lastViewed": now },
        },
      );
    }

    res.json({
      success: true,
      data: {
        viewCount: updatedProduct.viewCount,
      },
    });
  } catch (error) {
    console.error("Error recording product view:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Get user's liked products (works with auth token OR deviceId for anonymous)
// @route   GET /api/users/liked-products
// @access  Public (optionalAuth - supports both logged-in and anonymous users)
const getLikedProducts = async (req, res) => {
  try {
    const userId = req.userId;
    const deviceId = req.query.deviceId;

    let user;
    if (userId) {
      user = await User.findById(userId);
    } else if (deviceId) {
      user = await User.findOne({ deviceId });
    } else {
      return res.status(400).json({
        success: false,
        message: "Either login or provide device ID to view liked products",
      });
    }

    if (!user) {
      return res.json({ success: true, data: [] });
    }

    const populatedUser = await User.findById(user._id).populate({
      path: "likedProducts",
      populate: [
        { path: "brandId", select: brandList },
        { path: "storeId", select: storeList },
        { path: "categoryId", select: categoryList },
      ],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: populatedUser.likedProducts,
    });
  } catch (error) {
    console.error("Error getting liked products:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Get user's viewed products (works with auth token OR deviceId for anonymous)
// @route   GET /api/users/viewed-products
// @access  Public (optionalAuth - supports both logged-in and anonymous users)
const getViewedProducts = async (req, res) => {
  try {
    const userId = req.userId;
    const deviceId = req.query.deviceId;

    let user;
    if (userId) {
      user = await User.findById(userId);
    } else if (deviceId) {
      user = await User.findOne({ deviceId });
    } else {
      return res.status(400).json({
        success: false,
        message: "Either login or provide device ID to view history",
      });
    }

    if (!user) {
      return res.json({ success: true, data: [] });
    }

    const populatedUser = await User.findById(user._id).populate({
      path: "viewedProducts.productId",
      populate: [
        { path: "brandId", select: brandList },
        { path: "storeId", select: storeList },
        { path: "categoryId", select: categoryList },
      ],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: populatedUser?.viewedProducts || [],
    });
  } catch (error) {
    console.error("Error getting viewed products:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Follow/unfollow a store (works with auth token OR deviceId for anonymous)
// @route   POST /api/users/follow-store
// @access  Public (optionalAuth)
const toggleFollowStore = async (req, res) => {
  try {
    const { storeId, deviceId } = req.body;
    const userId = req.userId;

    if (!storeId) {
      return res.status(400).json({
        success: false,
        message: "Store ID is required",
      });
    }

    let user;
    if (userId) {
      user = await User.findById(userId);
    } else if (deviceId) {
      user = await User.findOne({ deviceId });
      if (!user) {
        user = new User({ deviceId });
        await user.save();
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "Either login or provide device ID to follow stores",
      });
    }

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const store = await Store.findById(storeId);
    if (!store) {
      return res
        .status(404)
        .json({ success: false, message: "Store not found" });
    }

    const isFollowed = (user.followedStores || []).some(
      (id) => id.toString() === storeId,
    );

    if (isFollowed) {
      user.followedStores = (user.followedStores || []).filter(
        (id) => id.toString() !== storeId,
      );
      await Store.findByIdAndUpdate(storeId, {
        $inc: { followerCount: -1 },
      });
    } else {
      if (!user.followedStores) user.followedStores = [];
      user.followedStores.push(storeId);
      await Store.findByIdAndUpdate(storeId, {
        $inc: { followerCount: 1 },
      });
    }
    await user.save();

    const updatedStore = await Store.findById(storeId)
      .select("followerCount")
      .lean();

    res.json({
      success: true,
      data: {
        isFollowed: !isFollowed,
        followerCount: Math.max(0, updatedStore.followerCount || 0),
      },
    });
  } catch (error) {
    console.error("Error toggling store follow:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Get user's followed stores
// @route   GET /api/users/followed-stores
// @access  Public (optionalAuth)
const getFollowedStores = async (req, res) => {
  try {
    const userId = req.userId;
    const deviceId = req.query.deviceId;

    let user;
    if (userId) {
      user = await User.findById(userId);
    } else if (deviceId) {
      user = await User.findOne({ deviceId });
    } else {
      return res.status(400).json({
        success: false,
        message: "Either login or provide device ID to view followed stores",
      });
    }

    if (!user || !user.followedStores?.length) {
      return res.json({ success: true, data: [] });
    }

    const stores = await Store.find({
      _id: { $in: user.followedStores },
      show: { $ne: false },
    })
      .populate("storeTypeId", "name icon")
      .lean();

    res.json({ success: true, data: stores });
  } catch (error) {
    console.error("Error getting followed stores:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Update anonymous (device) user display name
// @route   PUT /api/users/device-profile
// @access  Public (optionalAuth - uses deviceId)
const updateDeviceProfile = async (req, res) => {
  try {
    const { deviceId, name } = req.body;

    if (!deviceId || !name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Device ID and name are required",
      });
    }

    let user = await User.findOne({ deviceId });
    if (!user) {
      user = new User({ deviceId });
    }

    user.displayName = name.trim();
    await user.save();

    res.json({
      success: true,
      data: {
        _id: user._id,
        deviceId: user.deviceId,
        displayName: user.displayName,
      },
    });
  } catch (error) {
    console.error("Error updating device profile:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  getUserByDevice,
  toggleProductLike,
  toggleVideoLike,
  toggleFollowStore,
  recordProductView,
  getLikedProducts,
  getViewedProducts,
  getFollowedStores,
  updateDeviceProfile,
};
