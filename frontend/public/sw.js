/* eslint-disable no-restricted-globals */
/* global workbox */
importScripts("https://storage.googleapis.com/workbox-cdn/releases/6.6.0/workbox-sw.js");

const OFFLINE_PAGE = "/offline.html";
const APP_SHELL_CACHE = "app-shell-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) =>
      cache.addAll([OFFLINE_PAGE, "/", "/manifest.json", "/logo192.png", "/favicon.ico"])
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

if (workbox) {
  workbox.core.skipWaiting();
  workbox.core.clientsClaim();

  workbox.precaching.cleanupOutdatedCaches();

  // App shell and static assets
  workbox.routing.registerRoute(
    ({ request }) => request.mode === "navigate",
    new workbox.strategies.NetworkFirst({
      cacheName: "pages-cache-v1",
      networkTimeoutSeconds: 4,
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 60,
          maxAgeSeconds: 7 * 24 * 60 * 60,
        }),
      ],
    })
  );

  // Products/stores/banners/categories/jobs/reels => stale-while-revalidate
  workbox.routing.registerRoute(
    ({ url, request }) =>
      request.method === "GET" &&
      /\/api\/(products|stores|ads|categories|jobs|videos)/.test(url.pathname),
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: "content-api-cache-v1",
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 3000,
          maxAgeSeconds: 12 * 60 * 60,
          purgeOnQuotaError: true,
        }),
      ],
    })
  );

  // Profile/account => network-first
  workbox.routing.registerRoute(
    ({ url, request }) =>
      request.method === "GET" &&
      /\/api\/(auth\/profile|users)/.test(url.pathname),
    new workbox.strategies.NetworkFirst({
      cacheName: "profile-cache-v1",
      networkTimeoutSeconds: 5,
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 2 * 60 * 60,
        }),
      ],
    })
  );

  // Images/logos/thumbnails => cache-first
  workbox.routing.registerRoute(
    ({ request, url }) =>
      request.destination === "image" ||
      /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(url.pathname),
    new workbox.strategies.CacheFirst({
      cacheName: "images-cache-v1",
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 2500,
          maxAgeSeconds: 30 * 24 * 60 * 60,
          purgeOnQuotaError: true,
        }),
      ],
    })
  );

  // Queue write requests while offline and replay in background sync.
  const bgSyncPlugin = new workbox.backgroundSync.BackgroundSyncPlugin("offlineActionsQueue", {
    maxRetentionTime: 24 * 60,
  });

  workbox.routing.registerRoute(
    ({ url, request }) =>
      ["POST", "PUT", "PATCH", "DELETE"].includes(request.method) &&
      /\/api\//.test(url.pathname),
    new workbox.strategies.NetworkOnly({
      plugins: [bgSyncPlugin],
    }),
    "POST"
  );
  workbox.routing.registerRoute(
    ({ url, request }) =>
      ["POST", "PUT", "PATCH", "DELETE"].includes(request.method) &&
      /\/api\//.test(url.pathname),
    new workbox.strategies.NetworkOnly({
      plugins: [bgSyncPlugin],
    }),
    "PUT"
  );
  workbox.routing.registerRoute(
    ({ url, request }) =>
      ["POST", "PUT", "PATCH", "DELETE"].includes(request.method) &&
      /\/api\//.test(url.pathname),
    new workbox.strategies.NetworkOnly({
      plugins: [bgSyncPlugin],
    }),
    "PATCH"
  );
  workbox.routing.registerRoute(
    ({ url, request }) =>
      ["POST", "PUT", "PATCH", "DELETE"].includes(request.method) &&
      /\/api\//.test(url.pathname),
    new workbox.strategies.NetworkOnly({
      plugins: [bgSyncPlugin],
    }),
    "DELETE"
  );

  // Offline page fallback for navigation failures.
  const catchHandler = async ({ event }) => {
    if (event.request.destination === "document") {
      const cached = await caches.match(OFFLINE_PAGE);
      if (cached) return cached;
    }
    return Response.error();
  };
  workbox.routing.setCatchHandler(catchHandler);
}

// Service worker push notifications
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
    })
  );
});

self.addEventListener("sync", (event) => {
  if (event.tag === "sync-offline-actions") {
    event.waitUntil(
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsList) => {
        clientsList.forEach((client) => client.postMessage({ type: "SYNC_OFFLINE_ACTIONS" }));
      })
    );
  }
});
