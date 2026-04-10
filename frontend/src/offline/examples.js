/**
 * Offline examples for developers.
 * These snippets show how to use the reusable offline layer.
 */

import { STORES, idbSet } from "./indexedDb";
import { enqueueOfflineAction } from "./offlineQueue";
import { syncOfflineActions } from "./syncManager";

// Example 1: cache API responses in IndexedDB
export async function exampleCacheProducts(products) {
  await idbSet(STORES.apiCache, {
    key: "get::/api/products::{}",
    data: products,
    updatedAt: Date.now(),
    url: "/products",
  });
}

// Example 2: store custom offline data in IndexedDB
export async function exampleStoreDraftComment(postId, text) {
  await idbSet(STORES.meta, {
    key: `comment-draft:${postId}`,
    value: text,
    updatedAt: Date.now(),
  });
}

// Example 3: queue failed actions (like/favorite/cart/profile)
export async function exampleQueueLike(productId) {
  await enqueueOfflineAction({
    method: "post",
    url: "/users/like-product",
    data: { productId },
    headers: {},
  });
}

// Example 4: force sync when connection returns
export async function exampleSyncNow() {
  await syncOfflineActions();
}

// Example 5: graceful request handling
export function exampleIsOfflineQueuedResponse(response) {
  return response?.status === 202 && response?.data?.offlineQueued === true;
}
