/* global __APP_VERSION__ */
/**
 * Embedded at build time from package.json (see craco.config.js).
 */
export const APP_VERSION =
  typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "0.0.0-dev";
