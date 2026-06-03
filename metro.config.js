const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Alias Node core modules to browser-safe shims so viem/snarkjs bundle on web.
const ALIASES = {
  crypto: "crypto-browserify",
  stream: "stream-browserify",
  buffer: "buffer",
  events: "events",
  process: "process",
};

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const target = ALIASES[moduleName] ?? moduleName;
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, target, platform);
  }
  return context.resolveRequest(context, target, platform);
};

module.exports = config;
