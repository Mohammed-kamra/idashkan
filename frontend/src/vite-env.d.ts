/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_PROXY?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_BACKEND_URL?: string;
  readonly VITE_API_TIMEOUT_MS?: string;
  readonly VITE_DEBUG_NETWORK?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_GOOGLE_OAUTH_REDIRECT?: string;
  /** Comma-separated extra hostnames treated as in-app (same window), e.g. staging.example.com */
  readonly VITE_INTERNAL_LINK_HOSTS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

