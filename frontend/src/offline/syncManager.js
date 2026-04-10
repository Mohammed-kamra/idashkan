import api from "../services/api";
import {
  getPendingActions,
  markActionDone,
  markActionFailed,
} from "./offlineQueue";

let running = false;

export async function syncOfflineActions() {
  if (running) return;
  running = true;
  try {
    const pending = await getPendingActions();
    for (const action of pending) {
      try {
        await api.request({
          method: action.method,
          url: action.url,
          data: action.data,
          params: action.params,
          headers: { ...(action.headers || {}), "x-offline-replay": "1" },
          _skipOfflineQueue: true,
        });
        await markActionDone(action.id);
      } catch (err) {
        const message = err?.message || "Failed to sync action";
        await markActionFailed(action, message);
      }
    }
  } finally {
    running = false;
  }
}
