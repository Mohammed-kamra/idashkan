const { canAccessDataEntryApis } = require("../utils/roleAccess");

/** Requires `protect` to have run so `req.user` is set. */
module.exports = function requireDataEntry(req, res, next) {
  if (!req.user || !canAccessDataEntryApis(req.user)) {
    return res.status(403).json({
      success: false,
      message: "Forbidden",
    });
  }
  next();
};
