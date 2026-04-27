import axios from "axios";

// Proxy mode: use same-origin /api (avoids CORS, works on mobile). Set VITE_USE_PROXY=true in Vercel.
const USE_PROXY = import.meta.env.VITE_USE_PROXY === "true";
const ENV_API_BASE = (import.meta.env.VITE_API_BASE_URL || "").trim();
const shouldPreferSameOriginApi = (() => {
  if (typeof window === "undefined") return false;
  const host = String(window.location.hostname || "").toLowerCase();
  const isLocalHost =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.endsWith(".localhost");
  return !isLocalHost;
})();
const API_BASE_URL = USE_PROXY
  ? "/api"
  : ENV_API_BASE || (shouldPreferSameOriginApi ? "/api" : "http://localhost:5000/api");

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 45000,
});

// Add auth token to requests when available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Retry failed requests (helps with flaky mobile networks)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};
    const isNetworkError =
      !error.response &&
      (error.message === "Network Error" ||
        error.code === "ERR_NETWORK" ||
        error.code === "ECONNABORTED");

    const retryCount = originalRequest._retryCount || 0;
    if (isNetworkError && retryCount < 2) {
      originalRequest._retryCount = retryCount + 1;
      await new Promise((r) => setTimeout(r, 2000 * (retryCount + 1)));
      return api(originalRequest);
    }
    return Promise.reject(error);
  },
);

// Store API calls
export const storeAPI = {
  getAll: () => api.get("/stores"),
  getVisible: (params = {}) => api.get("/stores/visible", { params }),
  getAllIncludingHidden: () => api.get("/stores/all"),
  getById: (id) => api.get(`/stores/${id}`),
  create: (data) => api.post("/stores", data),
  update: (id, data) => api.put(`/stores/${id}`, data),
  delete: (id) => api.delete(`/stores/${id}`),
  toggleVisibility: (id) => api.put(`/stores/${id}/toggle-visibility`),
};

// Cities (public list for filters; admin CRUD under adminAPI)
export const cityAPI = {
  getAll: () => api.get("/cities"),
};

// StoreType API calls
export const storeTypeAPI = {
  getAll: () => api.get("/store-types"),
};

// BrandType API calls
export const brandTypeAPI = {
  getAll: () => api.get("/brand-types"),
  create: (data) => api.post("/brand-types", data),
  update: (id, data) => api.put(`/brand-types/${id}`, data),
  delete: (id) => api.delete(`/brand-types/${id}`),
};

// Brand API calls

export const brandAPI = {
  getAll: () => api.get("/brands"),
  getAllIncludingHidden: () => api.get("/brands/all"),
  getById: (id) => api.get(`/brands/${id}`),
  create: (data) => api.post("/brands", data),
  update: (id, data) => api.put(`/brands/${id}`, data),
  delete: (id) => api.delete(`/brands/${id}`),
};

// Company API calls
export const companyAPI = {
  getAll: () => api.get("/companies"),
  getAllIncludingHidden: () => api.get("/companies/all"),
  getById: (id) => api.get(`/companies/${id}`),
  create: (data) => api.post("/companies", data),
  update: (id, data) => api.put(`/companies/${id}`, data),
  delete: (id) => api.delete(`/companies/${id}`),
};

// Category API calls
export const categoryAPI = {
  getAll: () => api.get("/categories"),
  getById: (id) => api.get(`/categories/${id}`),
  create: (data) => api.post("/categories", data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
  getTypes: (id) => api.get(`/categories/${id}/types`),
  getByStoreType: (storeType) => api.get(`/categories/store-type/${storeType}`),
  uploadCategoryImage: async (categoryId, file) => {
    const formData = new FormData();
    formData.append("image", file);
    const res = await fetch(`${API_BASE_URL}/categories/${categoryId}/image`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Upload failed with status ${res.status}`);
    }
    return res.json();
  },
};

/**
 * Loads all products using server pagination (GET /products?page=&limit=).
 * Falls back to a single response if the server returns a plain array (legacy).
 */
export async function fetchAllProducts(filters = {}, pageSize = 500) {
  const limit = Math.min(Math.max(Number(pageSize) || 500, 1), 500);
  let page = 1;
  const out = [];
  for (;;) {
    const res = await api.get("/products", {
      params: { ...filters, page, limit },
    });
    const payload = res.data;
    if (Array.isArray(payload)) {
      return payload;
    }
    const items = Array.isArray(payload?.items) ? payload.items : [];
    out.push(...items);
    const total = typeof payload?.total === "number" ? payload.total : null;
    if (items.length < limit) break;
    if (total != null && out.length >= total) break;
    if (items.length === 0) break;
    page += 1;
  }
  return out;
}

// Product API calls
export const productAPI = {
  getAll: (filters = {}) => api.get("/products", { params: filters }),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post("/products", data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  getByBrand: (brandId) => api.get(`/products/brand/${brandId}`),
  getByCompany: (companyId) => api.get(`/products/company/${companyId}`),
  getByStore: (storeId) => api.get(`/products/store/${storeId}`),
  getByCategory: (category) => api.get(`/products/category/${category}`),
  getCategories: () => api.get("/products/categories"),
  /** Owner Data Entry: scoped product list (Bearer required). */
  getOwnerDataEntryList: () => api.get("/products/owner-data-entry"),
  /** Pending moderation list (Bearer required). */
  getPendingList: (params = {}) => api.get("/products/pending", { params }),
  getModeration: (id) => api.get(`/products/moderation/${id}`),
  rejectPending: (id) => api.post(`/products/${id}/reject`),
  bulkUpload: (data) => api.post("/products/bulk-upload", data),
};

// Gift API calls
export const giftAPI = {
  getAll: () => api.get("/gifts"),
  getById: (id) => api.get(`/gifts/${id}`),
  create: (data) => api.post("/gifts", data),
  update: (id, data) => api.put(`/gifts/${id}`, data),
  delete: (id) => api.delete(`/gifts/${id}`),
  getByStore: (storeId) => api.get(`/gifts/store/${storeId}`),
  getByBrand: (brandId) => api.get(`/gifts/brand/${brandId}`),
};

// Ad API calls
export const adAPI = {
  getAll: (params = {}) => api.get("/ads", { params }),
  getById: (id) => api.get(`/ads/${id}`),
  create: (data) => api.post("/ads", data),
  update: (id, data) => api.put(`/ads/${id}`, data),
  delete: (id) => api.delete(`/ads/${id}`),
};

// Theme API calls
export const themeAPI = {
  get: () => api.get("/theme"),
  update: ({ activeTheme, activeFontKey, navConfig, profileShortcuts } = {}) =>
    api.put("/theme", {
      activeTheme,
      activeFontKey,
      navConfig,
      profileShortcuts,
    }),
};

// Video/Reels API calls
export const videoAPI = {
  getAll: (params = {}) => api.get("/videos", { params }),
  create: (data) =>
    api.post("/videos", data, {
      timeout: 120000,
    }),
  update: (id, data) =>
    api.put(`/videos/${id}`, data, {
      timeout: 120000,
    }),
  delete: (id) => api.delete(`/videos/${id}`),
  incrementLike: (id) => api.post(`/videos/${id}/like`),
  incrementView: (id) => api.post(`/videos/${id}/view`),
  incrementShare: (id) => api.post(`/videos/${id}/share`),
  upload: (formData) =>
    api.post("/videos/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 300000,
    }),
};

// Jobs API calls
export const jobAPI = {
  getAll: (params = {}) => api.get("/jobs", { params }),
  /** Admin data entry: inactive + expired included. Requires Bearer token + admin account. */
  getAllAdmin: (params = {}) => api.get("/jobs/admin", { params }),
  create: (data) => api.post("/jobs", data),
  update: (id, data) => api.put(`/jobs/${id}`, data),
  delete: (id) => api.delete(`/jobs/${id}`),
  uploadImage: (formData) =>
    api.post("/jobs/upload-image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 120000,
    }),
};

// User API calls (work with auth token OR deviceId for anonymous users)
export const userAPI = {
  getByDevice: (deviceId) => api.get(`/users/device/${deviceId}`),
  toggleLike: (deviceId, productId, headers = {}) =>
    api.post(
      "/users/like-product",
      { productId, ...(deviceId && { deviceId }) },
      { headers },
    ),
  toggleVideoLike: (deviceId, videoId, headers = {}) =>
    api.post(
      "/users/like-video",
      { videoId, ...(deviceId && { deviceId }) },
      { headers },
    ),
  toggleFollowStore: (deviceId, storeId, headers = {}) =>
    api.post(
      "/users/follow-store",
      { storeId, ...(deviceId && { deviceId }) },
      { headers },
    ),
  recordView: (deviceId, productId, headers = {}) =>
    api.post("/users/view-product", { deviceId, productId }, { headers }),
  getLikedProducts: (deviceId, headers = {}) =>
    api.get("/users/liked-products", {
      params: deviceId ? { deviceId } : {},
      headers,
    }),
  getFollowedStores: (deviceId, headers = {}) =>
    api.get("/users/followed-stores", {
      params: deviceId ? { deviceId } : {},
      headers,
    }),
  getViewedProducts: (deviceId, headers = {}) =>
    api.get("/users/viewed-products", {
      params: deviceId ? { deviceId } : {},
      headers,
    }),
  pushSubscribe: (subscription, deviceId) =>
    api.post("/users/push-subscribe", {
      subscription,
      ...(deviceId && { deviceId }),
    }),
  updateDeviceProfile: (deviceId, name) =>
    api.put("/users/device-profile", { deviceId, name }),
};

// Auth API calls
export const authAPI = {
  register: (userData) => api.post("/auth/register", userData),
  login: (email, password) => api.post("/auth/login", { email, password }),
  googleLogin: (idToken) => api.post("/auth/google", { idToken }),
  getProfile: (headers) => api.get("/auth/profile", { headers }),
  updateProfile: (profileData, headers) =>
    api.put("/auth/profile", profileData, { headers }),
  changePassword: (currentPassword, newPassword, headers) =>
    api.put(
      "/auth/change-password",
      { currentPassword, newPassword },
      { headers },
    ),
  logout: (headers) => api.post("/auth/logout", {}, { headers }),
  deactivate: (headers) => api.post("/auth/deactivate", {}, { headers }),
};

// Settings API calls
export const settingsAPI = {
  get: () => api.get("/settings"),
  update: (data, headers) => api.put("/settings", data, { headers }),
};

// Notification API calls
export const notificationAPI = {
  getAll: (deviceId) =>
    api.get("/notifications", {
      params: deviceId ? { deviceId } : {},
    }),
  markAsRead: (id, deviceId) =>
    api.put(`/notifications/${id}/read`, deviceId ? { deviceId } : {}),
  markAllAsRead: (deviceId) =>
    api.put("/notifications/read-all", deviceId ? { deviceId } : {}),
  clearAll: (deviceId) =>
    api.put("/notifications/clear", deviceId ? { deviceId } : {}),
  getVapidPublic: () => api.get("/notifications/vapid-public"),
};

// Public translation overrides (merged into i18n at runtime)
export const translationAPI = {
  getAll: () => api.get("/translations"),
};

// AI translation (English, Arabic, Kurdish Sorani) — POST /api/ai/translate
export const aiAPI = {
  translate: (body) => api.post("/ai/translate", body),
};

// Search API calls
export const searchAPI = {
  search: (q, city = null) =>
    api.get("/search", { params: city ? { q, city } : { q } }),
};

/** Public search tracking (optional auth via axios interceptor). */
export const searchAnalyticsAPI = {
  logSearch: (body) => api.post("/search-analytics/log-search", body),
  recordClick: (id, body) => api.patch(`/search-analytics/${id}/click`, body),
};

/** App visit ping after splash (optional auth via axios interceptor). */
export const appVisitAPI = {
  ping: (body) => api.post("/app-visits/ping", body),
};

/** Draft cart WhatsApp order — full payload (optional auth). */
export const cartOrderLogAPI = {
  log: (body) => api.post("/cart-orders/log", body),
};

// Admin API calls
export const adminAPI = {
  getStats: () => api.get("/admin/stats"),
  getMostLikedProducts: () => api.get("/admin/products/most-liked"),
  getMostViewedProducts: () => api.get("/admin/products/most-viewed"),
  getStoreReport: (params = {}) => api.get("/admin/reports/stores", { params }),
  getBrandReport: (params = {}) => api.get("/admin/reports/brands", { params }),
  sendNotification: (data) => api.post("/admin/notifications/send", data),
  getUsers: (params) => api.get("/admin/users", { params }),
  createUser: (data) => api.post("/admin/users", data),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  deleteExpiredProducts: () => api.delete("/admin/products/expired"),
  translateMissingProducts: () => api.post("/admin/products/translate-missing"),
  upsertTranslation: (data) => api.put("/admin/translations", data),
  deleteTranslation: (id) => api.delete(`/admin/translations/${id}`),
  getCities: () => api.get("/admin/cities"),
  createCity: (data) => api.post("/admin/cities", data),
  updateCity: (id, data) => api.put(`/admin/cities/${id}`, data),
  deleteCity: (id) => api.delete(`/admin/cities/${id}`),

  getSearchAnalyticsOverview: (params = {}) =>
    api.get("/admin/search-analytics/overview", { params }),
  getSearchAnalyticsTrends: (params = {}) =>
    api.get("/admin/search-analytics/trends", { params }),
  getSearchAnalyticsTopKeywords: (params = {}) =>
    api.get("/admin/search-analytics/top-keywords", { params }),
  getSearchAnalyticsNoResults: (params = {}) =>
    api.get("/admin/search-analytics/no-results", { params }),
  getSearchAnalyticsTopFilters: (params = {}) =>
    api.get("/admin/search-analytics/top-filters", { params }),
  getSearchAnalyticsTopStores: (params = {}) =>
    api.get("/admin/search-analytics/top-stores", { params }),
  getSearchAnalyticsTopCategories: (params = {}) =>
    api.get("/admin/search-analytics/top-categories", { params }),
  getSearchAnalyticsPopularCities: (params = {}) =>
    api.get("/admin/search-analytics/popular-cities", { params }),
  getSearchAnalyticsConversion: (params = {}) =>
    api.get("/admin/search-analytics/conversion", { params }),
  getSearchAnalyticsRecent: (params = {}) =>
    api.get("/admin/search-analytics/recent", { params }),
  getSearchAnalyticsTrending: (params = {}) =>
    api.get("/admin/search-analytics/trending", { params }),
  getSearchAnalyticsTopClicked: (params = {}) =>
    api.get("/admin/search-analytics/top-clicked", { params }),
  exportSearchAnalyticsCsv: (params = {}) =>
    api.get("/admin/search-analytics/export", {
      params,
      responseType: "blob",
    }),

  getCartOrderLogs: (params = {}) =>
    api.get("/admin/cart-order-logs", { params }),

  getVisitorsReportDaily: (params = {}) =>
    api.get("/admin/visitors-report/daily", { params }),
};

/** Owner analytics dashboard (requires role `owner` + linked entity). */
export const ownerDashboardAPI = {
  getSummary: (params = {}) => api.get("/owner-dashboard/summary", { params }),
  getTopViewedProducts: (params = {}) =>
    api.get("/owner-dashboard/top-viewed-products", { params }),
  getTopLikedProducts: (params = {}) =>
    api.get("/owner-dashboard/top-liked-products", { params }),
  getComparisonChart: (params = {}) =>
    api.get("/owner-dashboard/comparison-chart", { params }),
};

/** Public-ish tracking (optional auth); used for profile views & contact taps. */
export const ownerAnalyticsAPI = {
  track: (body) => api.post("/owner-analytics/track", body),
};

export default api;
