import {
  probeBackendReachable,
  probeInternetConnectivity,
} from "./networkProbe";

/** @typedef {'offline' | 'server' | 'timeout' | 'backend' | 'dns' | 'client' | 'generic'} ErrorVariant */

/**
 * Classify axios / fetch errors without extra network I/O.
 * @param {unknown} error
 * @returns {{ kind: 'timeout' | 'network' | 'dns' | 'server' | 'client' | 'unknown', status?: number, code?: string }}
 */
export function classifyApiError(error) {
  const err = error && typeof error === "object" ? error : {};
  const response = "response" in err ? err.response : undefined;
  if (response && typeof response.status === "number") {
    const status = response.status;
    if (status === 408 || status === 504) {
      return { kind: "timeout", status };
    }
    if (status >= 500) {
      return { kind: "server", status };
    }
    if (status >= 400) {
      return { kind: "client", status };
    }
  }

  const code = "code" in err ? err.code : undefined;
  const message = String(
    "message" in err && err.message != null ? err.message : "",
  );

  if (code === "ECONNABORTED" || /timeout/i.test(message)) {
    return { kind: "timeout", code };
  }
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") {
    return { kind: "dns", code };
  }
  if (
    code === "ERR_NETWORK" ||
    message === "Network Error" ||
    code === "ERR_INTERNET_DISCONNECTED"
  ) {
    return { kind: "network", code };
  }

  return { kind: "unknown", code };
}

/**
 * After an API failure, distinguish real offline vs server/CORS/backend issues (async probes).
 * @param {unknown} error
 * @returns {Promise<{ variant: ErrorVariant }>}
 */
export async function resolveConnectionFailure(error) {
  const c = classifyApiError(error);

  if (c.kind === "server") {
    return { variant: "server" };
  }
  if (c.kind === "client") {
    return { variant: "client" };
  }

  if (c.kind === "dns") {
    const internetOk = await probeInternetConnectivity();
    if (!internetOk) {
      return { variant: "offline" };
    }
    return { variant: "dns" };
  }

  if (c.kind === "timeout") {
    const internetOk = await probeInternetConnectivity();
    if (!internetOk) {
      return { variant: "offline" };
    }
    const backendOk = await probeBackendReachable();
    if (!backendOk) {
      return { variant: "backend" };
    }
    return { variant: "timeout" };
  }

  if (c.kind === "network" || c.kind === "unknown") {
    const internetOk = await probeInternetConnectivity();
    if (!internetOk) {
      return { variant: "offline" };
    }
    const backendOk = await probeBackendReachable();
    if (!backendOk) {
      return { variant: "backend" };
    }
    return { variant: "backend" };
  }

  return { variant: "generic" };
}

/**
 * Short user-facing string for legacy catch blocks (sync, no probe).
 * Prefer resolveConnectionFailure + i18n keys for screens.
 * @param {unknown} error
 * @param {string} [fallback]
 */
export function getSyncErrorHint(error, fallback = "") {
  const c = classifyApiError(error);
  if (c.kind === "server") {
    return "Server error. Please try again later.";
  }
  if (c.kind === "timeout") {
    return "Request timed out. Please try again.";
  }
  if (c.kind === "dns") {
    return "Could not reach the server. Check your connection.";
  }
  if (c.kind === "network") {
    return fallback || "Connection failed. Please try again.";
  }
  return fallback || "Something went wrong. Please try again.";
}
