import React, { createContext, useState, useContext, useEffect } from "react";
import { settingsAPI } from "../services/api";
import { openWhatsAppLink } from "../utils/openWhatsAppLink";

const AppSettingsContext = createContext(null);

const DEFAULT_WHATSAPP = "+9647503683478";
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

export function normalizeContactField(v) {
  if (v == null) return "";
  return String(v).trim();
}

/** Merge API / settings payload into a stable shape (strings only; avoids losing links when values are numbers). */
export function mergeContactInfoFromApi(info, contactWhatsAppNumber) {
  const merged = { ...EMPTY_CONTACT_INFO, ...(info && typeof info === "object" ? info : {}) };
  for (const key of Object.keys(EMPTY_CONTACT_INFO)) {
    merged[key] = normalizeContactField(merged[key]);
  }
  merged.whatsapp =
    normalizeContactField(info?.whatsapp) ||
    normalizeContactField(contactWhatsAppNumber) ||
    DEFAULT_WHATSAPP;
  return merged;
}

export const AppSettingsProvider = ({ children }) => {
  const [contactWhatsAppNumber, setContactWhatsAppNumber] =
    useState(DEFAULT_WHATSAPP);
  const [contactInfo, setContactInfo] = useState(() =>
    mergeContactInfoFromApi(null, DEFAULT_WHATSAPP),
  );

  const fetchSettings = async () => {
    try {
      const res = await settingsAPI.get();
      const num = res?.data?.contactWhatsAppNumber;
      if (num) setContactWhatsAppNumber(normalizeContactField(num) || DEFAULT_WHATSAPP);
      const info = res?.data?.contactInfo;
      setContactInfo(mergeContactInfoFromApi(info, num));
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const openWhatsApp = () => {
    const num = (contactWhatsAppNumber || DEFAULT_WHATSAPP)
      .replace(/\s/g, "")
      .replace(/^\+/, "");
    if (!num) return;
    openWhatsAppLink(`https://api.whatsapp.com/send?phone=${num}`);
  };

  return (
    <AppSettingsContext.Provider
      value={{
        contactWhatsAppNumber,
        setContactWhatsAppNumber,
        contactInfo,
        setContactInfo,
        fetchSettings,
        openWhatsApp,
      }}
    >
      {children}
    </AppSettingsContext.Provider>
  );
};

export const useAppSettings = () => {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error("useAppSettings must be used within an AppSettingsProvider");
  }
  return context;
};
