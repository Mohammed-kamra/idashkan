import { STORES, idbDelete, idbGetAll, idbSet } from "./indexedDb";

const QUEUE_EVENT = "offline-queue-updated";

function emitQueueUpdate() {
  window.dispatchEvent(new CustomEvent(QUEUE_EVENT));
}

export function getOfflineQueueEventName() {
  return QUEUE_EVENT;
}

export async function enqueueOfflineAction(action) {
  const record = {
    ...action,
    createdAt: Date.now(),
    status: "pending",
    tries: 0,
  };
  await idbSet(STORES.queue, record);
  emitQueueUpdate();
}

export async function getPendingActions() {
  const all = await idbGetAll(STORES.queue);
  return all
    .filter((item) => item.status === "pending")
    .sort((a, b) => a.createdAt - b.createdAt);
}

export async function getQueueStats() {
  const all = await idbGetAll(STORES.queue);
  const pending = all.filter((q) => q.status === "pending").length;
  const failed = all.filter((q) => q.status === "failed").length;
  return { total: all.length, pending, failed };
}

export async function markActionDone(id) {
  await idbDelete(STORES.queue, id);
  emitQueueUpdate();
}

export async function markActionFailed(action, errorMessage) {
  await idbSet(STORES.queue, {
    ...action,
    status: "failed",
    tries: (action.tries || 0) + 1,
    errorMessage: errorMessage || "Unknown offline sync failure",
    lastTriedAt: Date.now(),
  });
  emitQueueUpdate();
}
