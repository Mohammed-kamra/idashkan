import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from "react";

const STORAGE_COLOR_MODE = "app.colorMode.v1";
const STORAGE_LEGACY = "app.darkMode.v1";

/** @returns {"light" | "dark" | "system"} */
function readStoredColorMode() {
  try {
    const v = localStorage.getItem(STORAGE_COLOR_MODE);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    // ignore
  }
  // Default: follow device (ignore legacy app.darkMode.v1 so new default applies once)
  return "system";
}

function getSystemDark() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return false;
  }
}

const DarkModeContext = createContext({
  darkMode: false,
  colorMode: "system",
  setColorMode: () => {},
  setDarkMode: () => {},
  toggleDarkMode: () => {},
  systemPrefersDark: false,
});

export const DarkModeProvider = ({ children }) => {
  const [colorMode, setColorModeState] = useState(readStoredColorMode);
  const [systemPrefersDark, setSystemPrefersDark] = useState(getSystemDark);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemPrefersDark(mq.matches);
    setSystemPrefersDark(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const darkMode = useMemo(() => {
    if (colorMode === "dark") return true;
    if (colorMode === "light") return false;
    return systemPrefersDark;
  }, [colorMode, systemPrefersDark]);

  const setColorMode = useCallback((mode) => {
    if (mode !== "light" && mode !== "dark" && mode !== "system") return;
    setColorModeState(mode);
    try {
      localStorage.setItem(STORAGE_COLOR_MODE, mode);
      localStorage.removeItem(STORAGE_LEGACY);
    } catch {
      // ignore
    }
  }, []);

  /** @param {boolean | ((prev: boolean) => boolean)} value */
  const setDarkMode = useCallback(
    (value) => {
      const next =
        typeof value === "function" ? value(darkMode) : Boolean(value);
      setColorMode(next ? "dark" : "light");
    },
    [darkMode, setColorMode],
  );

  const toggleDarkMode = useCallback(() => {
    setColorMode(darkMode ? "light" : "dark");
  }, [darkMode, setColorMode]);

  const value = useMemo(
    () => ({
      darkMode,
      colorMode,
      setColorMode,
      setDarkMode,
      toggleDarkMode,
      systemPrefersDark,
    }),
    [
      darkMode,
      colorMode,
      setColorMode,
      setDarkMode,
      toggleDarkMode,
      systemPrefersDark,
    ],
  );

  return (
    <DarkModeContext.Provider value={value}>{children}</DarkModeContext.Provider>
  );
};

export const useDarkMode = () => useContext(DarkModeContext);
