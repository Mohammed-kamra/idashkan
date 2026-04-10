module.exports = {
  globDirectory: "build",
  globPatterns: ["**/*.{js,css,html,png,jpg,jpeg,svg,webp,ico,json}"],
  swDest: "build/sw.js",
  cleanupOutdatedCaches: true,
  navigateFallback: "/offline.html",
  runtimeCaching: [
    {
      urlPattern: /\/api\/(products|stores|ads|categories|jobs|videos)/,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "content-api-cache-v1",
        expiration: { maxEntries: 3000, maxAgeSeconds: 12 * 60 * 60 },
      },
    },
    {
      urlPattern: /\/api\/(auth\/profile|users)/,
      handler: "NetworkFirst",
      options: {
        cacheName: "profile-cache-v1",
        networkTimeoutSeconds: 5,
        expiration: { maxEntries: 50, maxAgeSeconds: 2 * 60 * 60 },
      },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
      handler: "CacheFirst",
      options: {
        cacheName: "images-cache-v1",
        expiration: { maxEntries: 2500, maxAgeSeconds: 30 * 24 * 60 * 60 },
      },
    },
  ],
};
