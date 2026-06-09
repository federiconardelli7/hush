// Minimal `node:fs` shim for the native (Hermes) bundle.
//
// The eERC SDK, when it can't see a browser (`window.document`), does
// `await import('node:fs')` and calls `existsSync` to look for circuit files on
// disk before falling back to loading them by URL. There's no filesystem on a
// phone, so we report "not present" → the SDK takes the URL path (the circuits are
// served over https, see features/eerc/circuits.ts). Aliased in metro.config.js
// for native only; never reached on web (the SDK uses the browser branch there).
const existsSync = () => false;

const shim = { existsSync, promises: {} };
shim.default = shim;

module.exports = shim;
