# Offline-First Architecture

## Folder structure

- `src/offline/indexedDb.js` - IndexedDB low-level helper
- `src/offline/cachePolicy.js` - TTL and cache strategy policy per dataset
- `src/offline/offlineQueue.js` - queue writes while offline
- `src/offline/syncManager.js` - replay queued requests when online
- `src/offline/serviceWorkerRegistration.js` - SW registration + online listeners
- `src/services/offlineApiCache.js` - API response cache persistence
- `src/hooks/useOnlineStatus.js` - reusable connection status hook
- `src/hooks/useOfflineQueue.js` - reusable queue stats hook
- `src/hooks/useCachedData.js` - reusable hook to read cached datasets
- `src/components/OfflineBanner.js` - app-wide offline/restore banner
- `src/pages/OfflineFallback.js` - in-app fallback page
- `public/sw.js` - Workbox strategies + Background Sync + push handling
- `public/offline.html` - offline navigation fallback page
- `workbox-config.js` - production Workbox configuration reference

## Data retention policy

- Permanently cache (or very long TTL): icons, logos, static app shell assets
- Long TTL: categories/store metadata (1-3 days)
- Medium TTL: products/stores/jobs (6-12 hours)
- Short TTL: banners/reels feed (2-3 hours)
- Very short TTL: profile/account data (15-30 minutes, network-first)

## Stale data prevention

- Use stale-while-revalidate for public listing data to keep UI fast.
- Use network-first for account/profile and personalized data.
- Mark cached responses with `x-offline-cache` and render "cached" hints in UI where needed.
- Queue writes with metadata and replay in order when online.
- Keep conflict handling on backend using timestamps/version checks for profile edits.

## Mobile storage optimization

- Cap entries per dataset (`maxEntries`) to avoid unbounded growth.
- Prune oldest cache records after fetch failures and periodic sync.
- Avoid storing raw video binaries in IndexedDB; cache only thumbnails and metadata.
- Keep localStorage limited to tiny flags (`theme`, `dismissed-banners`, etc.).
