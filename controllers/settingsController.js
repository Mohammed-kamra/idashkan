const Settings = require("../models/Settings");

const DEFAULT_CONTACT = "+9647503683478";
const EMPTY_CONTACT_INFO = {
  whatsapp: "",
  facebook: "",
  instagram: "",
  snapchat: "",
  gmail: "",
  tiktok: "",
  viber: "",
  telegram: "",
};

function trimStr(v) {
  if (v == null) return "";
  return String(v).trim();
}

/** Merge stored contactInfo with top-level WhatsApp so clients never see an empty whatsapp when the number exists. */
function buildContactInfoResponse(settings) {
  const cw = settings.contactWhatsAppNumber || DEFAULT_CONTACT;
  const merged = {
    ...EMPTY_CONTACT_INFO,
    ...(settings.contactInfo || {}),
  };
  merged.whatsapp = trimStr(merged.whatsapp) || cw;
  return merged;
}

// @desc    Get app settings (public)
// @route   GET /api/settings
const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({
        contactWhatsAppNumber: DEFAULT_CONTACT,
        contactInfo: { ...EMPTY_CONTACT_INFO, whatsapp: DEFAULT_CONTACT },
      });
    }
    res.json({
      contactWhatsAppNumber:
        settings.contactWhatsAppNumber || DEFAULT_CONTACT,
      contactInfo: buildContactInfoResponse(settings),
    });
  } catch (err) {
    console.error("Get settings error:", err.message);
    res.status(500).json({
      contactWhatsAppNumber: DEFAULT_CONTACT,
      contactInfo: { ...EMPTY_CONTACT_INFO, whatsapp: DEFAULT_CONTACT },
    });
  }
};

// @desc    Update app settings (protected)
// @route   PUT /api/settings
const updateSettings = async (req, res) => {
  try {
    const { contactWhatsAppNumber, contactInfo } = req.body;
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({
        contactWhatsAppNumber: contactWhatsAppNumber || DEFAULT_CONTACT,
        contactInfo: {
          ...EMPTY_CONTACT_INFO,
          ...(contactInfo || {}),
        },
      });
    } else {
      if (contactWhatsAppNumber !== undefined) {
        settings.contactWhatsAppNumber =
          String(contactWhatsAppNumber).trim() || DEFAULT_CONTACT;
      }
      if (contactInfo !== undefined && typeof contactInfo === "object") {
        const prev = { ...EMPTY_CONTACT_INFO, ...(settings.contactInfo || {}) };
        const incoming = Object.fromEntries(
          Object.entries(contactInfo).map(([k, v]) => [k, trimStr(v)]),
        );
        const incomingFiltered = Object.fromEntries(
          Object.entries(incoming).filter(([k]) => k in EMPTY_CONTACT_INFO),
        );
        const keyCount = Object.keys(EMPTY_CONTACT_INFO).length;
        const fullReplace =
          Object.keys(incomingFiltered).length >= keyCount;
        const allIncomingEmpty = Object.keys(EMPTY_CONTACT_INFO).every(
          (k) => !incomingFiltered[k] || incomingFiltered[k] === "",
        );
        const prevHasData = Object.keys(EMPTY_CONTACT_INFO).some(
          (k) => prev[k] && trimStr(prev[k]) !== "",
        );
        if (fullReplace && allIncomingEmpty && prevHasData) {
          console.warn(
            "[settings] skipped contactInfo update: full replace with all-empty while DB had data (avoid accidental wipe)",
          );
        } else {
          settings.contactInfo = {
            ...prev,
            ...incomingFiltered,
          };
        }
      }
      await settings.save();
    }
    res.json({
      contactWhatsAppNumber:
        settings.contactWhatsAppNumber || DEFAULT_CONTACT,
      contactInfo: buildContactInfoResponse(settings),
    });
  } catch (err) {
    console.error("Update settings error:", err.message);
    res.status(500).send("Server Error");
  }
};

module.exports = {
  getSettings,
  updateSettings,
};
