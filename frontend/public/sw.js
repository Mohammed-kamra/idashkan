/* eslint-disable no-restricted-globals */
/* global workbox */
/**
 * Service worker: push notifications + light asset caching.
 * API responses are not cached for offline replay (NetworkOnly for /api/).
 */
importScripts("https://storage.googleapis.com/workbox-cdn/releases/6.6.0/workbox-sw.js");

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

if (workbox) {
  workbox.core.skipWaiting();
  workbox.core.clientsClaim();
  workbox.precaching.cleanupOutdatedCaches();

  // API: network only — no stale offline data from the SW cache
  workbox.routing.registerRoute(
    ({ url, request }) =>
      request.method === "GET" &&
      url.origin === self.location.origin &&
      /\/api\//.test(url.pathname),
    new workbox.strategies.NetworkOnly(),
  );

  workbox.routing.registerRoute(
    ({ request }) => request.mode === "navigate",
    new workbox.strategies.NetworkFirst({
      cacheName: "pages-cache-v2",
      networkTimeoutSeconds: 4,
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 40,
          maxAgeSeconds: 24 * 60 * 60,
        }),
      ],
    }),
  );

  workbox.routing.registerRoute(
    ({ request, url }) =>
      request.destination === "image" ||
      /\.(png|jpg|jpeg|gif|webp|svg|ico)$/i.test(url.pathname),
    new workbox.strategies.CacheFirst({
      cacheName: "images-cache-v3",
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 2000,
          maxAgeSeconds: 30 * 24 * 60 * 60,
          purgeOnQuotaError: true,
        }),
      ],
    }),
  );
}

self.addEventListener("push", function (event) {
  if (!event.data) return;
  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: event.data.text() || "Notification" };
  }
  const title = data.title || "Notification";
  const options = {
    body: data.body || "",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    data: data,
    tag: "discount-app-" + Date.now(),
    renotify: true,
    silent: false,
    requireInteraction: false,
    vibrate: [200, 100, 200],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const urlToOpen = "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.indexOf(self.registration.scope) !== -1 && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    }),
  );
});
