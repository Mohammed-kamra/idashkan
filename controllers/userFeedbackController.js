const UserFeedback = require("../models/UserFeedback");

const VALID_TYPES = new Set(["suggestion", "problem"]);

exports.createFeedback = async (req, res) => {
  try {
    const rawType = String(req.body?.type || "")
      .trim()
      .toLowerCase();
    const type = VALID_TYPES.has(rawType) ? rawType : "";
    const note = String(req.body?.note || "").trim().slice(0, 5000);

    if (!type) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid feedback type" });
    }
    if (!note) {
      return res
        .status(400)
        .json({ success: false, message: "Feedback note is required" });
    }

    const user = req.user || null;
    const doc = await UserFeedback.create({
      type,
      note,
      userId: req.userId || null,
      guestDeviceId: user ? null : String(req.body?.guestDeviceId || "").slice(0, 128) || null,
      guestName: user ? null : String(req.body?.guestName || "").trim().slice(0, 120) || null,
      email: user
        ? String(user?.email || "").trim().slice(0, 160) || null
        : String(req.body?.email || "").trim().slice(0, 160) || null,
    });

    return res.status(201).json({
      success: true,
      data: { id: String(doc._id) },
    });
  } catch (error) {
    console.error("createFeedback:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.listFeedback = async (req, res) => {
  try {
    const pageRaw = parseInt(String(req.query.page || "1"), 10);
    const page = Math.max(1, Number.isFinite(pageRaw) ? pageRaw : 1);
    const limitRaw = parseInt(String(req.query.limit || "30"), 10);
    const limit = Math.min(
      100,
      Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 30),
    );
    const skip = (page - 1) * limit;

    const query = {};
    const type = String(req.query.type || "")
      .trim()
      .toLowerCase();
    const status = String(req.query.status || "")
      .trim()
      .toLowerCase();

    if (VALID_TYPES.has(type)) query.type = type;
    if (status === "new" || status === "reviewed") query.status = status;

    const [total, rows] = await Promise.all([
      UserFeedback.countDocuments(query),
      UserFeedback.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "email username displayName")
        .lean(),
    ]);

    return res.json({
      success: true,
      data: rows,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error("listFeedback:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
