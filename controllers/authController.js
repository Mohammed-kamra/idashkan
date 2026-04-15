const mongoose = require("mongoose");
const User = require("../models/User");
const Store = require("../models/Store");
const Brand = require("../models/Brand");
const Company = require("../models/Company");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const { deleteUserAndAssociatedData } = require("./deleteUserAndAssociatedData");
const {
  validateAndNormalizeOwnerEntitiesInput,
} = require("../utils/ownerEntities");

const GRACE_DAYS = 30;

async function ownerEntityExists(entityType, entityId) {
  if (!entityId || !mongoose.Types.ObjectId.isValid(String(entityId))) {
    return false;
  }
  const id = String(entityId);
  if (entityType === "store") {
    return !!(await Store.findById(id).select("_id").lean());
  }
  if (entityType === "brand") {
    return !!(await Brand.findById(id).select("_id").lean());
  }
  if (entityType === "company") {
    return !!(await Company.findById(id).select("_id").lean());
  }
  return false;
}

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || "your-secret-key", {
    expiresIn: "7d",
  });
};

/** Username from email local part; ensure min length + uniqueness. */
async function uniqueUsernameFromEmail(email) {
  const raw = (email.split("@")[0] || "user").replace(/[^a-zA-Z0-9_]/g, "");
  let base = raw.length >= 3 ? raw.slice(0, 26) : `usr_${raw || "user"}`.slice(0, 26);
  if (base.length < 3) base = "user";
  let candidate = base;
  let n = 0;
  while (await User.findOne({ username: candidate })) {
    n += 1;
    candidate = `${base.slice(0, 20)}_${n}`;
  }
  return candidate;
}

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Username, email and password are required",
      });
    }

    // Validate username length (min 3 characters to match User model)
    if (username.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: "Username must be at least 3 characters long",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email or username already exists",
      });
    }

    // Create new user
    const user = new User({
      username,
      email,
      password,
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      data: {
        user: user.getPublicProfile(),
        token,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during registration",
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const emailOrUsername = (req.body.email || "").trim();
    const password = (req.body.password || "").trim();

    // Validate required fields
    if (!emailOrUsername || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Find user by email (lowercase) or username
    const isEmail = emailOrUsername.includes("@");
    const user = await User.findOne(
      isEmail
        ? { email: emailOrUsername.toLowerCase() }
        : { username: emailOrUsername },
    );

    if (!user) {
      console.log(
        "[Login] User not found:",
        isEmail ? "email" : "username",
        isEmail
          ? emailOrUsername.toLowerCase().slice(0, 3) + "..."
          : emailOrUsername.slice(0, 3) + "...",
      );
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!user.password) {
      console.log("[Login] User has no password (possibly anonymous account)");
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Deactivated account: reactivate within grace period or delete if past
    if (!user.isActive && user.scheduledDeletionAt) {
      const now = new Date();
      if (now >= user.scheduledDeletionAt) {
        await deleteUserAndAssociatedData(user._id);
        return res.status(401).json({
          success: false,
          message: "Account has been permanently deleted after the grace period",
        });
      }
      // Within grace period: verify password first, then reactivate
      const isPasswordValid = await user.comparePassword((password || "").trim());
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }
      user.isActive = true;
      user.deactivatedAt = undefined;
      user.scheduledDeletionAt = undefined;
      user.lastLogin = new Date();
      await user.save();
      const token = generateToken(user._id);
      return res.json({
        success: true,
        data: { user: user.getPublicProfile(), token },
        message: "Login successful. Account reactivated.",
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Account is deactivated",
      });
    }

    // Check password (trim to avoid accidental spaces)
    const isPasswordValid = await user.comparePassword((password || "").trim());
    if (!isPasswordValid) {
      console.log(
        "[Login] Wrong password for user:",
        user.email || user.username,
      );
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      data: {
        user: user.getPublicProfile(),
        token,
      },
      message: "Login successful",
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const publicProfile = user.getPublicProfile();

    res.json({
      success: true,
      data: {
        user: publicProfile,
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { displayName, avatar, ownerEntityType, ownerEntityId, ownerEntities } =
      req.body;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update fields
    if (displayName !== undefined) user.displayName = displayName && displayName.trim() ? displayName.trim() : null;
    if (avatar !== undefined) user.avatar = avatar;

    if (user.role === "owner") {
      if (ownerEntities !== undefined) {
        const v = await validateAndNormalizeOwnerEntitiesInput(ownerEntities);
        if (!v.ok) {
          return res.status(400).json({
            success: false,
            message: v.message,
          });
        }
        user.ownerEntities = v.list;
        user.ownerEntityType = v.list[0].entityType;
        user.ownerEntityId = v.list[0].entityId;
      } else if (ownerEntityType !== undefined || ownerEntityId !== undefined) {
        const t =
          ownerEntityType !== undefined
            ? ownerEntityType
            : user.ownerEntityType;
        const id = ownerEntityId !== undefined ? ownerEntityId : user.ownerEntityId;
        if (!t || !["store", "brand", "company"].includes(t)) {
          return res.status(400).json({
            success: false,
            message: "Invalid owner entity type",
          });
        }
        if (!id || !(await ownerEntityExists(t, id))) {
          return res.status(400).json({
            success: false,
            message: "Invalid owner entity",
          });
        }
        user.ownerEntityType = t;
        user.ownerEntityId = id;
        user.ownerEntities = [{ entityType: t, entityId: id }];
      }
    }

    await user.save();

    res.json({
      success: true,
      data: {
        user: user.getPublicProfile(),
      },
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.password) {
      return res.status(400).json({
        success: false,
        message:
          "No password on file for this account. Sign in with Google or use account recovery.",
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  try {
    res.json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Deactivate account (30-day grace period, then permanent deletion)
// @route   POST /api/auth/deactivate
// @access  Private
const deactivate = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    if (!user.username && user.deviceId) {
      return res.status(400).json({
        success: false,
        message: "Guest accounts cannot be deactivated",
      });
    }

    const now = new Date();
    const scheduledDeletionAt = new Date(now);
    scheduledDeletionAt.setDate(scheduledDeletionAt.getDate() + GRACE_DAYS);

    user.isActive = false;
    user.deactivatedAt = now;
    user.scheduledDeletionAt = scheduledDeletionAt;
    await user.save();

    res.json({
      success: true,
      message: "Account deactivated. You have 30 days to log in again to reactivate.",
      data: { scheduledDeletionAt: user.scheduledDeletionAt },
    });
  } catch (error) {
    console.error("Deactivate error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Sign in / register with Google ID token (Gmail / Google account)
// @route   POST /api/auth/google
// @access  Public
const googleLogin = async (req, res) => {
  try {
    const clientId = (process.env.GOOGLE_CLIENT_ID || "").trim();
    if (!clientId) {
      return res.status(503).json({
        success: false,
        message: "Google sign-in is not configured on the server",
      });
    }

    const idToken = (req.body.idToken || "").trim();
    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: "Google credential is required",
      });
    }

    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({
      idToken,
      audience: clientId,
    });
    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(401).json({
        success: false,
        message: "Invalid Google token",
      });
    }

    if (!payload.email_verified) {
      return res.status(400).json({
        success: false,
        message: "Google email must be verified",
      });
    }

    const googleId = payload.sub;
    const email = (payload.email || "").toLowerCase().trim();
    const displayName = (payload.name || "").trim() || null;
    const picture = (payload.picture || "").trim() || null;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Google account has no email",
      });
    }

    let user =
      (await User.findOne({ googleId })) ||
      (await User.findOne({ email }));

    if (user && user.deviceId && !user.username) {
      return res.status(400).json({
        success: false,
        message: "This email is linked to a guest session. Use a full account or another email.",
      });
    }

    if (user && !user.isActive && user.scheduledDeletionAt) {
      const now = new Date();
      if (now >= user.scheduledDeletionAt) {
        await deleteUserAndAssociatedData(user._id);
        return res.status(401).json({
          success: false,
          message: "Account has been permanently deleted after the grace period",
        });
      }
      user.isActive = true;
      user.deactivatedAt = undefined;
      user.scheduledDeletionAt = undefined;
      if (!user.googleId) user.googleId = googleId;
      if (picture && !user.avatar) user.avatar = picture;
      if (displayName && !user.displayName) user.displayName = displayName;
      user.lastLogin = new Date();
      await user.save();
      const token = generateToken(user._id);
      return res.json({
        success: true,
        data: { user: user.getPublicProfile(), token },
        message: "Login successful. Account reactivated.",
      });
    }

    if (user && !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Account is deactivated",
      });
    }

    if (!user) {
      const username = await uniqueUsernameFromEmail(email);
      user = new User({
        username,
        email,
        googleId,
        displayName,
        avatar: picture || undefined,
        isVerified: true,
      });
      await user.save();
    } else {
      if (!user.googleId) user.googleId = googleId;
      if (picture && !user.avatar) user.avatar = picture;
      if (displayName && !user.displayName) user.displayName = displayName;
      user.lastLogin = new Date();
      await user.save();
    }

    const token = generateToken(user._id);
    res.json({
      success: true,
      data: {
        user: user.getPublicProfile(),
        token,
      },
      message: "Login successful",
    });
  } catch (error) {
    console.error("Google login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during Google sign-in",
    });
  }
};

module.exports = {
  register,
  login,
  googleLogin,
  getProfile,
  updateProfile,
  changePassword,
  logout,
  deactivate,
};
