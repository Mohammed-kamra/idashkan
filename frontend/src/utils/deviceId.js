/**
 * Stable anonymous device id for guest users.
 * - Survives many app updates by mirroring across localStorage, cookie, and IndexedDB.
 * - WebViews / uninstall may still clear all local data; that cannot be fixed without a native or login-based id.
 */

const STORAGE_KEY = "deviceId";
const COOKIE_NAME = "patris_device_id";
const IDB_NAME = "patris_device";
const IDB_STORE = "kv";
const IDB_VERSION = 1;
/** ~10 years — cookie backup when localStorage is cleared but cookie survives (some WebViews). */
const COOKIE_MAX_AGE_SEC = 10 * 365 * 24 * 60 * 60;

const generateRandomId = () => {
  if (window.crypto && window.crypto.getRandomValues) {
    const buf = new Uint8Array(16);
    window.crypto.getRandomValues(buf);
    return (
      "dev_" +
      Array.from(buf)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
    );
  }
  return (
    "dev_" +
    Math.random().toString(36).substring(2, 10) +
    Math.random().toString(36).substring(2, 10)
  );
};

function isValidStoredId(v) {
  if (v == null || typeof v !== "string") return false;
  const t = v.trim();
  if (t.length < 6 || t.length > 200) return false;
  return true;
}

function getCookie(name) {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(
    new RegExp(
      "(?:^|; )" + name.replace(/([.$?*|{}()[\]\\/+^])/g, "\\$1") + "=([^;]*)",
    ),
  );
  return m ? decodeURIComponent(m[1]) : null;
}

function setCookie(name, value, maxAgeSec) {
  if (typeof document === "undefined") return;
  const secure = window.location?.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSec}; SameSite=Lax${secure}`;
}

function deleteCookie(name) {
  if (typeof document === "undefined") return;
  document.cookie = `${encodeURIComponent(name)}=; path=/; max-age=0`;
}

function openIdb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

function idbGet(key) {
  return new Promise((resolve) => {
    openIdb().then((db) => {
      if (!db) {
        resolve(null);
        return;
      }
      try {
        const tx = db.transaction(IDB_STORE, "readonly");
        const getReq = tx.objectStore(IDB_STORE).get(key);
        getReq.onsuccess = () => resolve(getReq.result ?? null);
        getReq.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  });
}

function idbSet(key, value) {
  return new Promise((resolve) => {
    openIdb().then((db) => {
      if (!db) {
        resolve();
        return;
      }
      try {
        const tx = db.transaction(IDB_STORE, "readwrite");
        tx.objectStore(IDB_STORE).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
        tx.onabort = () => resolve();
      } catch {
        resolve();
      }
    });
  });
}

function idbDelete(key) {
  return new Promise((resolve) => {
    openIdb().then((db) => {
      if (!db) {
        resolve();
        return;
      }
      try {
        const tx = db.transaction(IDB_STORE, "readwrite");
        tx.objectStore(IDB_STORE).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  });
}

/**
 * Persist id to cookie + IndexedDB (localStorage set by caller).
 * Fire-and-forget IDB; cookie is sync.
 */
export function persistDeviceIdMirrors(deviceId) {
  if (typeof window === "undefined" || !isValidStoredId(deviceId)) return;
  const id = deviceId.trim();
  try {
    setCookie(COOKIE_NAME, id, COOKIE_MAX_AGE_SEC);
  } catch {
    /* ignore */
  }
  void idbSet(STORAGE_KEY, id);
}

/**
 * Call once before React root render so the first getDeviceId() sees a restored id
 * when localStorage was cleared but cookie or IndexedDB still has the value (common after some updates).
 */
export async function hydrateDeviceId() {
  if (typeof window === "undefined") return;

  let id = null;
  try {
    id = localStorage.getItem(STORAGE_KEY);
  } catch {
    id = null;
  }
  if (isValidStoredId(id)) {
    persistDeviceIdMirrors(id);
    return;
  }

  /** Optional: native WebView sets a stable id when no local id exists (e.g. ANDROID_ID / Keychain). */
  const nativeRaw =
    typeof window !== "undefined" &&
    typeof window.__PATRIS_DEVICE_ID__ === "string"
      ? window.__PATRIS_DEVICE_ID__.trim()
      : "";
  if (nativeRaw.length >= 8 && nativeRaw.length <= 128) {
    const nativeId = nativeRaw.startsWith("dev_")
      ? nativeRaw
      : `dev_native_${nativeRaw}`;
    try {
      localStorage.setItem(STORAGE_KEY, nativeId);
    } catch {
      /* ignore */
    }
    persistDeviceIdMirrors(nativeId);
    return;
  }

  id = getCookie(COOKIE_NAME);
  if (isValidStoredId(id)) {
    try {
      localStorage.setItem(STORAGE_KEY, id.trim());
    } catch {
      /* ignore */
    }
    persistDeviceIdMirrors(id.trim());
    return;
  }

  try {
    id = await idbGet(STORAGE_KEY);
  } catch {
    id = null;
  }
  if (isValidStoredId(id)) {
    try {
      localStorage.setItem(STORAGE_KEY, id.trim());
    } catch {
      /* ignore */
    }
    persistDeviceIdMirrors(id.trim());
    return;
  }

  id = generateRandomId();
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* still set cookie + idb so next load may recover */
  }
  persistDeviceIdMirrors(id);
}

export const generateDeviceId = () => {
  let deviceId = null;
  try {
    deviceId = localStorage.getItem(STORAGE_KEY);
  } catch {
    deviceId = null;
  }

  if (!isValidStoredId(deviceId)) {
    deviceId = getCookie(COOKIE_NAME);
    if (isValidStoredId(deviceId)) {
      deviceId = deviceId.trim();
      try {
        localStorage.setItem(STORAGE_KEY, deviceId);
      } catch {
        /* ignore */
      }
    }
  }

  if (!isValidStoredId(deviceId)) {
    deviceId = generateRandomId();
    try {
      localStorage.setItem(STORAGE_KEY, deviceId);
    } catch {
      /* ignore */
    }
  } else {
    deviceId = deviceId.trim();
  }

  persistDeviceIdMirrors(deviceId);
  return deviceId;
};

export const getDeviceId = () => {
  return generateDeviceId();
};

export const clearDeviceId = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  deleteCookie(COOKIE_NAME);
  void idbDelete(STORAGE_KEY);
};
