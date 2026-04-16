import React, {
  createContext,
  useState,
  useContext,
  useMemo,
  useEffect,
  useCallback,
} from "react";
import { useTranslation } from "react-i18next";
import { cityAPI } from "../services/api";

const CityFilterContext = createContext(null);

export const CITY_ONBOARDING_KEY = "cityOnboardingComplete";
/** First-visit flow: language step completed → then city step */
export const LANGUAGE_ONBOARDING_KEY = "languageOnboardingComplete";

/** Offline / pre-migration fallback — matches former hardcoded list */
const FALLBACK_CITIES = [
  { name: "Erbil", flag: "🏛️" },
  { name: "Sulaimani", flag: "🏔️" },
  { name: "Duhok", flag: "🏞️" },
  { name: "Kerkuk", flag: "🛢️" },
  { name: "Halabja", flag: "🌸" },
];

export const CityFilterProvider = ({ children }) => {
  const [selectedCity, setSelectedCity] = useState("Erbil");
  const [cityRecords, setCityRecords] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(true);
  const [citiesNonce, setCitiesNonce] = useState(0);
  const [cityOnboardingDone, setCityOnboardingDone] = useState(() => {
    try {
      return localStorage.getItem(CITY_ONBOARDING_KEY) === "1";
    } catch {
      return false;
    }
  });
  const { t, i18n } = useTranslation();

  const completeCityOnboarding = useCallback((city) => {
    if (!city) return;
    setSelectedCity(city);
    try {
      localStorage.setItem("selectedCity", city);
      localStorage.setItem(CITY_ONBOARDING_KEY, "1");
    } catch {
      // ignore
    }
    setCityOnboardingDone(true);
  }, []);

  const refreshCities = useCallback(async () => {
    try {
      const res = await cityAPI.getAll();
      setCityRecords(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error("Failed to load cities", e);
      setCityRecords([]);
    } finally {
      setCitiesNonce((n) => n + 1);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCitiesLoading(true);
      try {
        const res = await cityAPI.getAll();
        if (!cancelled) {
          setCityRecords(Array.isArray(res.data) ? res.data : []);
        }
      } catch (e) {
        console.error("Failed to load cities", e);
        if (!cancelled) {
          setCityRecords([]);
        }
      } finally {
        if (!cancelled) {
          setCitiesLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cities = useMemo(() => {
    const raw =
      cityRecords.length > 0
        ? cityRecords.filter((c) => c.isActive !== false)
        : FALLBACK_CITIES.map((c) => ({ name: c.name, flag: c.flag }));
    return raw.map((c) => {
      const value = c.name;
      const flag = c.flag || "📍";
      const label = t(`city.${value}`, { defaultValue: value });
      return { value, flag, label };
    });
  }, [cityRecords, t, i18n.language]);

  const changeCity = (city) => {
    setSelectedCity(city);
    localStorage.setItem("selectedCity", city);
  };

  useEffect(() => {
    if (citiesLoading) return;
    const names = cities.map((c) => c.value);
    if (!names.length) return;

    if (!cityOnboardingDone) {
      setSelectedCity((prev) =>
        names.includes(prev) ? prev : names[0],
      );
      return;
    }

    setSelectedCity((prev) => {
      const saved = localStorage.getItem("selectedCity");
      let next = prev;
      if (saved && names.includes(saved)) {
        next = saved;
      } else if (names.includes(prev)) {
        next = prev;
      } else {
        next = names[0];
      }
      if (next !== prev) {
        localStorage.setItem("selectedCity", next);
      }
      return next;
    });
  }, [citiesLoading, cities, cityOnboardingDone]);

  return (
    <CityFilterContext.Provider
      value={{
        selectedCity,
        changeCity,
        cities,
        citiesLoading,
        citiesNonce,
        refreshCities,
        cityOnboardingDone,
        completeCityOnboarding,
      }}
    >
      {children}
    </CityFilterContext.Provider>
  );
};

export const useCityFilter = () => {
  const context = useContext(CityFilterContext);
  if (!context) {
    throw new Error("useCityFilter must be used within a CityFilterProvider");
  }
  return context;
};
