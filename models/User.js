const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  // Authentication fields (required for registered users, optional for anonymous)
  username: {
    type: String,
    required: function () {
      return !this.deviceId;
    }, // Only required if no deviceId
    unique: true,
    sparse: true, // Allow multiple null values
    trim: true,
    minlength: 3,
    maxlength: 30,
  },
  email: {
    type: String,
    required: function () {
      return !this.deviceId;
    }, // Only required if no deviceId
    unique: true,
    sparse: true, // Allow multiple null values
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: function () {
      return !this.deviceId;
    }, // Only required if no deviceId
    minlength: 6,
  },

  // Profile fields
  displayName: {
    type: String,
    required: false,
    trim: true,
    maxlength: 100,
  },
  avatar: {
    type: String,
  },

  // Anonymous user tracking (for non-logged users)
  deviceId: {
    type: String,
    required: false,
    // Removed unique constraint to allow multiple registered users without deviceId
    sparse: true,
  },
  sessionId: {
    type: String,
    required: false,
  },

  // User preferences and tracking
  likedProducts: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },
  ],
  likedVideos: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Video",
    },
  ],
  followedStores: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
    },
  ],
  viewedProducts: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
      viewCount: {
        type: Number,
        default: 1,
      },
      lastViewed: {
        type: Date,
        default: Date.now,
      },
    },
  ],

  // Account status
  isActive: {
    type: Boolean,
    default: true,
  },
  deactivatedAt: {
    type: Date,
    required: false,
  },
  scheduledDeletionAt: {
    type: Date,
    required: false,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },

  /** Application role: all accounts default to normal user; admin assigns `support` for Data Entry access. */
  role: {
    type: String,
    enum: ["user", "support"],
    default: "user",
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastActive: {
    type: Date,
    default: Date.now,
  },
  lastLogin: {
    type: Date,
  },
});

// Hash password before saving (only for registered users with passwords)
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Update lastActive on save
userSchema.pre("save", function (next) {
  this.lastActive = Date.now();
  next();
});

// Method to compare password (only for registered users)
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false; // Anonymous users don't have passwords
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to get display name
userSchema.methods.getFullName = function () {
  return this.displayName || this.username || "Anonymous User";
};

// Method to get public profile (without sensitive data)
userSchema.methods.getPublicProfile = function () {
  try {
    if (this.deviceId && !this.username) {
      // Anonymous user
      return {
        _id: this._id,
        deviceId: this.deviceId,
        isAnonymous: true,
        role: this.role || "user",
        likedProducts: this.likedProducts,
        likedVideos: this.likedVideos,
        viewedProducts: this.viewedProducts,
        createdAt: this.createdAt,
      };
    }

    // Registered user
    return {
      _id: this._id,
      username: this.username,
      displayName: this.displayName,
      email: this.email,
      avatar: this.avatar,
      isActive: this.isActive,
      role: this.role || "user",
      likedProducts: this.likedProducts,
      likedVideos: this.likedVideos,
      viewedProducts: this.viewedProducts,
      createdAt: this.createdAt,
    };
  } catch (error) {
    console.error("Error in getPublicProfile:", error);
    return {
      _id: this._id,
      username: this.username || "Unknown",
      displayName: this.displayName || "",
      email: this.email || "",
      isActive: this.isActive || false,
      role: this.role || "user",
      likedProducts: this.likedProducts || [],
      likedVideos: this.likedVideos || [],
      viewedProducts: this.viewedProducts || [],
      createdAt: this.createdAt,
    };
  }
};

module.exports = mongoose.model("User", userSchema);
