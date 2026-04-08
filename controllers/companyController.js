const Company = require("../models/Company");
const { normalizeExpiryDate } = require("../utils/normalizeExpiryDate");
const Product = require("../models/Product");
const BrandType = require("../models/BrandType");

const publicCompanyFilter = { statusAll: { $ne: "off" } };

async function ensureBrandTypeIdFromLegacy(data) {
  if (!data) return data;
  const next = { ...data };
  if (!next.brandTypeId && typeof next.type === "string" && next.type.trim()) {
    const name = next.type.trim();
    let bt = await BrandType.findOne({ name });
    if (!bt) {
      let icon = "🏷️";
      const lower = name.toLowerCase();
      if (lower.includes("food") || lower.includes("grocery")) icon = "🍞";
      else if (lower.includes("clothes") || lower.includes("fashion"))
        icon = "👗";
      else if (lower.includes("tech") || lower.includes("elect")) icon = "🔌";
      bt = await BrandType.create({ name, icon });
    }
    next.brandTypeId = bt._id;
  }
  delete next.type;
  return next;
}

const getCompanies = async (req, res) => {
  try {
    const companies = await Company.find(publicCompanyFilter)
      .populate("brandTypeId")
      .sort({ isVip: -1, name: 1 });
    const serialized = companies.map((c) => {
      const obj = c.toObject();
      return {
        ...obj,
        type:
          obj.brandTypeId && obj.brandTypeId.name
            ? obj.brandTypeId.name
            : undefined,
      };
    });
    res.json(serialized);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

const getCompanyById = async (req, res) => {
  try {
    const company = await Company.findOne({
      _id: req.params.id,
      ...publicCompanyFilter,
    }).populate("brandTypeId");
    if (!company) return res.status(404).json({ msg: "Company not found" });
    const obj = company.toObject();
    res.json({
      ...obj,
      type:
        obj.brandTypeId && obj.brandTypeId.name
          ? obj.brandTypeId.name
          : undefined,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

const getAllCompanies = async (req, res) => {
  try {
    const companies = await Company.find()
      .populate("brandTypeId")
      .sort({ isVip: -1, name: 1 });
    const serialized = companies.map((c) => {
      const obj = c.toObject();
      return {
        ...obj,
        type:
          obj.brandTypeId && obj.brandTypeId.name
            ? obj.brandTypeId.name
            : undefined,
      };
    });
    res.json(serialized);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

const createCompany = async (req, res) => {
  try {
    const body = await ensureBrandTypeIdFromLegacy(req.body);
    const company = new Company({
      ...body,
      statusAll: body.statusAll === "off" ? "off" : "on",
      expireDate: body.expireDate ? normalizeExpiryDate(body.expireDate) : null,
    });
    await company.save();
    const populated = await Company.findById(company._id).populate("brandTypeId");
    const obj = populated.toObject();
    res.json({
      ...obj,
      type:
        obj.brandTypeId && obj.brandTypeId.name
          ? obj.brandTypeId.name
          : undefined,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

const updateCompany = async (req, res) => {
  try {
    const body = await ensureBrandTypeIdFromLegacy(req.body);
    const normalizedBody = { ...body };
    if (body.statusAll !== undefined) {
      normalizedBody.statusAll = body.statusAll === "off" ? "off" : "on";
    }
    if (body.expireDate !== undefined) {
      normalizedBody.expireDate = body.expireDate
        ? normalizeExpiryDate(body.expireDate)
        : null;
    }
    const company = await Company.findByIdAndUpdate(req.params.id, normalizedBody, {
      new: true,
    }).populate("brandTypeId");
    if (!company) return res.status(404).json({ msg: "Company not found" });
    const obj = company.toObject();
    res.json({
      ...obj,
      type:
        obj.brandTypeId && obj.brandTypeId.name
          ? obj.brandTypeId.name
          : undefined,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

const deleteCompany = async (req, res) => {
  try {
    const companyId = req.params.id;
    const productCount = await Product.countDocuments({ companyId });
    if (productCount > 0) {
      return res.status(400).json({
        msg: "Cannot delete company. It has associated products. Please delete the products first.",
      });
    }
    const company = await Company.findByIdAndDelete(companyId);
    if (!company) return res.status(404).json({ msg: "Company not found" });
    res.json({ msg: "Company deleted" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

module.exports = {
  getCompanies,
  getAllCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
};
