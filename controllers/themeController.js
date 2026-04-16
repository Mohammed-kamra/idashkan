const Settings = require("../models/Settings");

/** Keep in sync with settingsController defaults so first Settings doc (theme) is not missing contact fields. */
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

const ALLOWED_THEMES = [
  "default",
  "blackWhite",
  "ramadan",
  "rain",
  "neon1",
  "neon2",
  "flash-sale",
  "luxury",
  "eco-green",
  "ice",
  "festival",
  "tech",
  "minimal",
  "sunset",
  "middle-east",
  "marketplace",
];

// Fonts are defined in frontend/public/fonts and registered in /fonts/fonts.css.
// Allow any reasonable font-family key chosen by admin UI.
const isSafeFontKey = (value) =>
  typeof value === "string" &&
  value.trim().length > 0 &&
  value.trim().length <= 80;

const DEFAULT_NAV_CONFIG = {
  template: "template1",
  topSlots: {
    topleft1: "",
    topleft2: "",
    center: "label",
    topright1: "",
    topright2: "",
  },
  bottomSlots: {
    bottomleft1: "home",
    bottomleft2: "categories",
    center: "reels",
    bottomright1: "favourites",
    bottomright2: "profile",
  },
};

const ALLOWED_NAV_TEMPLATES = ["template1", "template2", "custom"];
const ALLOWED_NAV_ACTIONS = [
  "", // empty slot
  "none",
  "label",
  "home",
  "search",
  "refresh",
  "categories",
  "reels",
  "favourites",
  "stores",
  "gifts",
  "shopping",
  "profile",
  "brands",
  "companies",
  "jobs",
  "city",
  "language",
  "notifications",
];

const sanitizeSlot = (value) => {
  const v = String(value || "").trim();
  return ALLOWED_NAV_ACTIONS.includes(v) ? v : "";
};

const DEFAULT_PROFILE_SHORTCUTS = [
  "brands",
  "companies",
  "findjob",
  "categories",
  "stores",
  "gifts",
  "search",
  "reels",
];

const ALLOWED_PROFILE_SHORTCUT_IDS = new Set([
  "home",
  "search",
  "categories",
  "reels",
  "favourites",
  "stores",
  "gifts",
  "shopping",
  "brands",
  "companies",
  "findjob",
]);

const sanitizeProfileShortcuts = (input) => {
  if (!Array.isArray(input)) return [...DEFAULT_PROFILE_SHORTCUTS];
  const seen = new Set();
  const out = [];
  for (const raw of input) {
    const id = String(raw || "").trim();
    if (!ALLOWED_PROFILE_SHORTCUT_IDS.has(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= 12) break;
  }
  return out.length > 0 ? out : [...DEFAULT_PROFILE_SHORTCUTS];
};

const sanitizeNavConfig = (input) => {
  if (!input || typeof input !== "object") return null;
  const template = String(input.template || "").trim();
  const safeTemplate = ALLOWED_NAV_TEMPLATES.includes(template)
    ? template
    : DEFAULT_NAV_CONFIG.template;

  const top = input.topSlots && typeof input.topSlots === "object" ? input.topSlots : {};
  const bottom =
    input.bottomSlots && typeof input.bottomSlots === "object"
      ? input.bottomSlots
      : {};

  return {
    template: safeTemplate,
    topSlots: {
      topleft1: sanitizeSlot(top.topleft1),
      topleft2: sanitizeSlot(top.topleft2),
      center: sanitizeSlot(top.center) || "label",
      topright1: sanitizeSlot(top.topright1),
      topright2: sanitizeSlot(top.topright2),
    },
    bottomSlots: {
      bottomleft1: sanitizeSlot(bottom.bottomleft1) || "home",
      bottomleft2: sanitizeSlot(bottom.bottomleft2) || "categories",
      center: sanitizeSlot(bottom.center) || "reels",
      bottomright1: sanitizeSlot(bottom.bottomright1) || "favourites",
      bottomright2: sanitizeSlot(bottom.bottomright2) || "profile",
    },
  };
};

const isAdminUser = (user) => {
  if (!user) return false;
  const adminEmails = ["mshexani45@gmail.com", "admin@gmail.com"];
  return adminEmails.includes(user.email);
};

// @desc    Get active theme (public)
// @route   GET /api/theme
const getTheme = async (req, res) => {
  try {
    let settings = await Settings.findOne().lean();
    if (!settings) {
      settings = await Settings.create({
        activeTheme: "default",
        activeFontKey: "default",
        navConfig: DEFAULT_NAV_CONFIG,
        profileShortcuts: [...DEFAULT_PROFILE_SHORTCUTS],
        contactWhatsAppNumber: DEFAULT_CONTACT,
        contactInfo: { ...EMPTY_CONTACT_INFO, whatsapp: DEFAULT_CONTACT },
      });
      settings = settings.toObject();
    }
    const activeTheme = settings.activeTheme || "default";
    const activeFontKey = settings.activeFontKey || "default";
    const navConfig = settings.navConfig || DEFAULT_NAV_CONFIG;
    const profileShortcuts = sanitizeProfileShortcuts(
      settings.profileShortcuts,
    );
    res.json({ activeTheme, activeFontKey, navConfig, profileShortcuts });
  } catch (err) {
    console.error("Get theme error:", err.message);
    res.json({
      activeTheme: "default",
      activeFontKey: "default",
      navConfig: DEFAULT_NAV_CONFIG,
      profileShortcuts: [...DEFAULT_PROFILE_SHORTCUTS],
    });
  }
};

// @desc    Update active theme (admin only)
// @route   PUT /api/theme
const updateTheme = async (req, res) => {
  try {
    if (!isAdminUser(req.user)) {
      return res.status(403).json({
        success: false,
        message: "Admin privileges required",
      });
    }

    const theme = String(req.body?.activeTheme || "").trim();
    if (!ALLOWED_THEMES.includes(theme)) {
      return res.status(400).json({
        success: false,
        message: `Invalid theme. Allowed: ${ALLOWED_THEMES.join(", ")}`,
      });
    }

    const fontKeyRaw = req.body?.activeFontKey;
    const fontKey =
      fontKeyRaw === undefined ? undefined : String(fontKeyRaw || "").trim();
    if (fontKey !== undefined && !isSafeFontKey(fontKey)) {
      return res.status(400).json({
        success: false,
        message: "Invalid font",
      });
    }

    const navConfigRaw = req.body?.navConfig;
    const navConfig =
      navConfigRaw === undefined ? undefined : sanitizeNavConfig(navConfigRaw);
    if (navConfigRaw !== undefined && !navConfig) {
      return res.status(400).json({ success: false, message: "Invalid navConfig" });
    }

    const profileShortcutsRaw = req.body?.profileShortcuts;
    const profileShortcuts =
      profileShortcutsRaw === undefined
        ? undefined
        : sanitizeProfileShortcuts(profileShortcutsRaw);

    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({
        activeTheme: theme,
        activeFontKey: fontKey || "default",
        navConfig: navConfig || DEFAULT_NAV_CONFIG,
        profileShortcuts:
          profileShortcuts !== undefined
            ? profileShortcuts
            : [...DEFAULT_PROFILE_SHORTCUTS],
        contactWhatsAppNumber: DEFAULT_CONTACT,
        contactInfo: { ...EMPTY_CONTACT_INFO, whatsapp: DEFAULT_CONTACT },
      });
    } else {
      settings.activeTheme = theme;
      if (fontKey !== undefined) {
        settings.activeFontKey = fontKey || "default";
      }
      if (navConfig !== undefined) {
        settings.navConfig = navConfig;
      }
      if (profileShortcuts !== undefined) {
        settings.profileShortcuts = profileShortcuts;
      }
      await settings.save();
    }

    res.json({
      success: true,
      activeTheme: settings.activeTheme,
      activeFontKey: settings.activeFontKey || "default",
      navConfig: settings.navConfig || DEFAULT_NAV_CONFIG,
      profileShortcuts: sanitizeProfileShortcuts(settings.profileShortcuts),
    });
  } catch (err) {
    console.error("Update theme error:", err.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

module.exports = {
  getTheme,
  updateTheme,
  ALLOWED_THEMES,
};

