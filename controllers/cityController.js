const City = require("../models/City");
const Store = require("../models/Store");

const isAdminUser = (user) => {
  if (!user) return false;
  const adminEmails = ["mshexani45@gmail.com", "admin@gmail.com"];
  return adminEmails.includes(user.email);
};

const DEFAULT_CITIES = [
  { name: "Erbil", flag: "🏛️", sortOrder: 0 },
  { name: "Sulaimani", flag: "🏔️", sortOrder: 1 },
  { name: "Duhok", flag: "🏞️", sortOrder: 2 },
  { name: "Kerkuk", flag: "🛢️", sortOrder: 3 },
  { name: "Halabja", flag: "🌸", sortOrder: 4 },
];

const seedCitiesIfEmpty = async () => {
  const n = await City.countDocuments();
  if (n === 0) {
    await City.insertMany(
      DEFAULT_CITIES.map((c) => ({ ...c, isActive: true })),
    );
    console.log("[migration] Seeded default cities");
  }
};

const getPublicCities = async (req, res) => {
  try {
    const cities = await City.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .select("name flag sortOrder isActive")
      .lean();
    res.json(cities);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

const getAdminCities = async (req, res) => {
  if (!isAdminUser(req.user)) {
    return res.status(403).json({ msg: "Forbidden" });
  }
  try {
    const cities = await City.find()
      .sort({ sortOrder: 1, name: 1 })
      .lean();
    res.json(cities);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

const createCity = async (req, res) => {
  if (!isAdminUser(req.user)) {
    return res.status(403).json({ msg: "Forbidden" });
  }
  try {
    const { name, flag, sortOrder, isActive } = req.body;
    const trimmed = String(name || "").trim();
    if (!trimmed) {
      return res.status(400).json({ msg: "Name is required" });
    }
    const city = await City.create({
      name: trimmed,
      flag:
        flag != null && String(flag).trim() !== ""
          ? String(flag).trim()
          : "📍",
      sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0,
      isActive: isActive !== false,
    });
    res.status(201).json(city);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ msg: "City name already exists" });
    }
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

const updateCity = async (req, res) => {
  if (!isAdminUser(req.user)) {
    return res.status(403).json({ msg: "Forbidden" });
  }
  try {
    const { name, flag, sortOrder, isActive } = req.body;
    const city = await City.findById(req.params.id);
    if (!city) {
      return res.status(404).json({ msg: "Not found" });
    }

    const oldName = city.name;
    let newName = oldName;
    if (name !== undefined) {
      newName = String(name).trim();
      if (!newName) {
        return res.status(400).json({ msg: "Name cannot be empty" });
      }
    }

    if (newName !== oldName) {
      const exists = await City.findOne({
        name: newName,
        _id: { $ne: city._id },
      });
      if (exists) {
        return res.status(409).json({ msg: "City name already exists" });
      }
      await Store.updateMany(
        { storecity: oldName },
        { $set: { storecity: newName } },
      );
      city.name = newName;
    }

    if (flag !== undefined) {
      city.flag =
        String(flag).trim() !== "" ? String(flag).trim() : "📍";
    }
    if (sortOrder !== undefined) {
      city.sortOrder = Number.isFinite(Number(sortOrder))
        ? Number(sortOrder)
        : city.sortOrder;
    }
    if (isActive !== undefined) {
      city.isActive = Boolean(isActive);
    }

    await city.save();
    res.json(city);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

const deleteCity = async (req, res) => {
  if (!isAdminUser(req.user)) {
    return res.status(403).json({ msg: "Forbidden" });
  }
  try {
    const city = await City.findById(req.params.id);
    if (!city) {
      return res.status(404).json({ msg: "Not found" });
    }

    const inUse = await Store.countDocuments({ storecity: city.name });
    if (inUse > 0) {
      city.isActive = false;
      await city.save();
      return res.json({
        softDeleted: true,
        msg: "City has stores assigned; it was deactivated instead.",
        city,
      });
    }

    await City.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

module.exports = {
  seedCitiesIfEmpty,
  getPublicCities,
  getAdminCities,
  createCity,
  updateCity,
  deleteCity,
};
