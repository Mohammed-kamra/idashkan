const ownerDashboardService = require("../services/ownerDashboardService");

function ctx(req) {
  return req.ownerContext;
}

exports.getSummary = async (req, res) => {
  try {
    const { entityType, entityId } = ctx(req);
    const data = await ownerDashboardService.buildSummary(entityType, entityId, req.query);
    res.json({ success: true, data });
  } catch (e) {
    console.error("owner getSummary:", e);
    res.status(500).json({ success: false, message: e.message || "Server error" });
  }
};

exports.getTopViewedProducts = async (req, res) => {
  try {
    const { entityType, entityId } = ctx(req);
    const rows = await ownerDashboardService.topViewedProducts(
      entityType,
      entityId,
      req.query,
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error("owner getTopViewedProducts:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getTopLikedProducts = async (req, res) => {
  try {
    const { entityType, entityId } = ctx(req);
    const rows = await ownerDashboardService.topLikedProducts(
      entityType,
      entityId,
      req.query,
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error("owner getTopLikedProducts:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getComparisonChart = async (req, res) => {
  try {
    const { entityType, entityId } = ctx(req);
    const data = await ownerDashboardService.comparisonChart(
      entityType,
      entityId,
      req.query,
    );
    res.json({ success: true, data });
  } catch (e) {
    console.error("owner getComparisonChart:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
