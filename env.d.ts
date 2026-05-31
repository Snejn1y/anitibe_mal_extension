/// <reference types="wxt/vite-builder-env" />

interface ImportMetaEnv {
  /** MAL API application Client ID (from .env). */
  readonly WXT_MAL_CLIENT_ID: string;
  /** MAL API application Client Secret (from .env). */
  readonly WXT_MAL_CLIENT_SECRET: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
