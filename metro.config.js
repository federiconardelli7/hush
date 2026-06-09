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
const resolveWith = (context, moduleName, platform, overrides) => {
  const ctx = overrides ? { ...context, ...overrides } : context;
  if (defaultResolveRequest) {
    return defaultResolveRequest(ctx, moduleName, platform);
  }
  return ctx.resolveRequest(ctx, moduleName, platform);
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Native only (@privy-io/expo + viem): a few deps ship package "exports" maps
  // that break the Metro native bundle. Disable/redirect them for native only,
  // leaving web resolution exactly as it was (the live web app must be unaffected).
  if (platform !== "web") {
    if (moduleName === "isows" || moduleName.startsWith("zustand")) {
      return resolveWith(context, moduleName, platform, {
        unstable_enablePackageExports: false,
      });
    }
    if (moduleName === "jose") {
      return resolveWith(context, moduleName, platform, {
        unstable_conditionNames: ["browser"],
      });
    }
  }

  const target = ALIASES[moduleName] ?? moduleName;
  return resolveWith(context, target, platform);
};

module.exports = config;
