const Job = require("../models/Job");
const { normalizeExpiryDate } = require("../utils/normalizeExpiryDate");
const { storeJob, brandJob, storeTypeList } = require("../utils/refPopulate");
const { canAccessDataEntryApis } = require("../utils/roleAccess");

// @desc    Get jobs (public)
// @route   GET /api/jobs?storeTypeId=...&q=...
// @access  Public
const buildJobsQuery = (q) => {
  const filter = {
    active: { $ne: false },
    $or: [{ expireDate: null }, { expireDate: { $gt: new Date() } }],
  };
  if (q) {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$and = [
      {
        $or: [
          { title: { $regex: escaped, $options: "i" } },
          { description: { $regex: escaped, $options: "i" } },
        ],
      },
    ];
  }
  return filter;
};

// Public list — always active + non-expired (same for every user; auth does not widen results).
const getJobs = async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const storeTypeId = String(req.query.storeTypeId || "").trim();
    const filter = buildJobsQuery(q);
    const jobs = await Job.find(filter)
      .sort({ createdAt: -1 })
      .populate({
        path: "storeId",
        select: storeJob,
        populate: { path: "storeTypeId", select: storeTypeList },
      })
      .populate({ path: "brandId", select: brandJob })
      .lean();

    // storeType filter is applied only to store-owned jobs (brand jobs bypass)
    const filtered =
      storeTypeId && storeTypeId !== "all"
        ? jobs.filter((j) => {
            if (!j.storeId) return true;
            const st = j.storeId.storeTypeId;
            const stId = st && (st._id || st);
            return String(stId) === String(storeTypeId);
          })
        : jobs;

    res.json(filtered);
  } catch (err) {
    console.error("Get jobs error:", err.message);
    res.status(500).json({ message: "Server Error" });
  }
};

// Admin list — includes inactive and expired (data entry / moderation only).
const getJobsAdmin = async (req, res) => {
  try {
    if (!canAccessDataEntryApis(req.user)) {
      return res.status(403).json({ message: "Admin privileges required" });
    }
    const q = String(req.query.q || "").trim();
    const storeTypeId = String(req.query.storeTypeId || "").trim();
    const filter = {};
    if (q) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$and = [
        {
          $or: [
            { title: { $regex: escaped, $options: "i" } },
            { description: { $regex: escaped, $options: "i" } },
          ],
        },
      ];
    }

    const jobs = await Job.find(filter)
      .sort({ createdAt: -1 })
      .populate({
        path: "storeId",
        select: storeJob,
        populate: { path: "storeTypeId", select: storeTypeList },
      })
      .populate({ path: "brandId", select: brandJob })
      .lean();

    const filtered =
      storeTypeId && storeTypeId !== "all"
        ? jobs.filter((j) => {
            if (!j.storeId) return true;
            const st = j.storeId.storeTypeId;
            const stId = st && (st._id || st);
            return String(stId) === String(storeTypeId);
          })
        : jobs;

    res.json(filtered);
  } catch (err) {
    console.error("Get jobs admin error:", err.message);
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Create job (admin)
// @route   POST /api/jobs
// @access  Private/Admin
const createJob = async (req, res) => {
  try {
    if (!canAccessDataEntryApis(req.user)) {
      return res.status(403).json({ message: "Admin privileges required" });
    }
    const job = await Job.create({
      title: req.body?.title,
      titleEn: req.body?.titleEn,
      titleAr: req.body?.titleAr,
      titleKu: req.body?.titleKu,
      description: req.body?.description,
      descriptionEn: req.body?.descriptionEn,
      descriptionAr: req.body?.descriptionAr,
      descriptionKu: req.body?.descriptionKu,
      gender: req.body?.gender,
      image: req.body?.image || "",
      storeId: req.body?.storeId || null,
      brandId: req.body?.brandId || null,
      city:
        req.body?.city != null && String(req.body.city).trim() !== ""
          ? String(req.body.city).trim()
          : "",
      expireDate: req.body?.expireDate || null,
      active: req.body?.active !== undefined ? Boolean(req.body.active) : true,
    });
    const populated = await Job.findById(job._id)
      .populate({
        path: "storeId",
        select: storeJob,
        populate: { path: "storeTypeId", select: storeTypeList },
      })
      .populate({ path: "brandId", select: brandJob })
      .lean();
    res.json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message || "Invalid job" });
  }
};

// @desc    Update job (admin)
// @route   PUT /api/jobs/:id
// @access  Private/Admin
const updateJob = async (req, res) => {
  try {
    if (!canAccessDataEntryApis(req.user)) {
      return res.status(403).json({ message: "Admin privileges required" });
    }
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found" });

    const fields = [
      "title",
      "titleEn",
      "titleAr",
      "titleKu",
      "description",
      "descriptionEn",
      "descriptionAr",
      "descriptionKu",
      "gender",
      "image",
      "city",
      "expireDate",
      "active",
    ];
    for (const f of fields) {
      if (req.body?.[f] !== undefined) {
        if (f === "expireDate") {
          job[f] =
            req.body.expireDate != null && req.body.expireDate !== ""
              ? normalizeExpiryDate(req.body.expireDate)
              : null;
        } else {
          job[f] = req.body[f];
        }
      }
    }
    // Owner fields must be updated together so switching Store ↔ Brand clears the other side.
    // Omitting storeId in JSON left the old storeId set when only brandId was sent.
    if (req.body.storeId !== undefined || req.body.brandId !== undefined) {
      const storeId =
        req.body.storeId != null && String(req.body.storeId).trim() !== ""
          ? req.body.storeId
          : null;
      const brandId =
        req.body.brandId != null && String(req.body.brandId).trim() !== ""
          ? req.body.brandId
          : null;
      job.storeId = storeId;
      job.brandId = brandId;
    }
    await job.save();
    const populated = await Job.findById(job._id)
      .populate({
        path: "storeId",
        select: storeJob,
        populate: { path: "storeTypeId", select: storeTypeList },
      })
      .populate({ path: "brandId", select: brandJob })
      .lean();
    res.json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message || "Invalid job" });
  }
};

// @desc    Delete job (admin)
// @route   DELETE /api/jobs/:id
// @access  Private/Admin
const deleteJob = async (req, res) => {
  try {
    if (!canAccessDataEntryApis(req.user)) {
      return res.status(403).json({ message: "Admin privileges required" });
    }
    const job = await Job.findByIdAndDelete(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = { getJobs, getJobsAdmin, createJob, updateJob, deleteJob };

