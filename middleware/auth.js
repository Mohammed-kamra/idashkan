const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { syncAuditUserFromRequest } = require("../utils/auditContext");

// Middleware to protect routes (require authentication)
const protect = async (req, res, next) => {
  try {
    let token;

    // Get token from header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "your-secret-key",
      );

      // Get user from token
      const user = await User.findById(decoded.userId).select("-password");
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid token. User not found.",
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: "Account is deactivated.",
        });
      }

      // Add user to request object
      req.user = user;
      req.userId = user._id;
      syncAuditUserFromRequest(req);
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid token.",
      });
    }
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Optional authentication middleware (doesn't require token but adds user if available)
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    // Get token from header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (token) {
      try {
        // Verify token
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || "your-secret-key",
        );

        // Get user from token
        const user = await User.findById(decoded.userId).select("-password");
        if (user && user.isActive) {
          req.user = user;
          req.userId = user._id;
        }
      } catch (error) {
        // Expired/invalid token: proceed as guest (optional auth)
        if (error.name !== "TokenExpiredError") {
          console.log("Invalid token in optional auth:", error.message);
        }
      }
    }

    syncAuditUserFromRequest(req);
    next();
  } catch (error) {
    console.error("Optional auth middleware error:", error);
    next(); // Continue even if there's an error
  }
};

module.exports = {
  protect,
  optionalAuth,
};
