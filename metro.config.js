const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// The eERC SDK probes `node:fs` (existsSync) on non-browser platforms to look for
// local circuit files. There's no filesystem on a phone, so the native bundle
// resolves it to a shim that reports "not present" → the SDK loads circuits by URL.
const NODE_FS_SHIM = path.resolve(__dirname, "src/shims/nodeFs.js");

// @avalabs/eerc-sdk declares main: "dist/index.cjs" (which it doesn't ship) and
// module: "dist/index.js" (the real ESM build). Metro's native resolver prefers
// `main` → a missing file, so point native straight at the ESM entry (Metro
// transpiles it). Web resolves it fine via `module`, so this is native-only.
const EERC_SDK_ESM = path.resolve(
  __dirname,
  "node_modules/@avalabs/eerc-sdk/dist/index.js",
);
const OS_SHIM = path.resolve(__dirname, "src/shims/os.js");
const EMPTY_SHIM = path.resolve(__dirname, "src/shims/empty.js");

// Stock Hermes has no WebAssembly, so the real snarkjs can't prove on native.
// Serve the WebView prover bridge instead (see src/features/eerc/prover/).
const SNARKJS_BRIDGE = path.resolve(
  __dirname,
  "src/features/eerc/prover/snarkjsBridge.native.ts",
);

// Prover-chain packages whose node builds require Hermes-absent builtins — resolved
// to their browser/ESM builds on native instead (see the resolver below).
const PROVER_DEPS = new Set([
  "ffjavascript",
  "wasmbuilder",
  "circom_runtime",
  "fastfile",
]);

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
    // node builtins the snarkjs/ffjavascript prover chain requires but that Hermes
    // lacks: fs → "not present" (circuits load by URL); os → a single CPU (keeps
    // proving single-threaded); readline/tty/worker_threads/web-worker → unused
    // CLI/worker stubs.
    if (moduleName === "node:fs" || moduleName === "fs") {
      return { type: "sourceFile", filePath: NODE_FS_SHIM };
    }
    if (moduleName === "os") {
      return { type: "sourceFile", filePath: OS_SHIM };
    }
    if (
      moduleName === "readline" ||
      moduleName === "tty" ||
      moduleName === "worker_threads" ||
      moduleName === "web-worker"
    ) {
      return { type: "sourceFile", filePath: EMPTY_SHIM };
    }
    if (moduleName === "@avalabs/eerc-sdk") {
      return { type: "sourceFile", filePath: EERC_SDK_ESM };
    }
    // Groth16 proving runs in the ProverHost WebView (Hermes lacks WASM); the
    // SDK's snarkjs import gets the bridge that forwards fullProve/calldata.
    if (moduleName === "snarkjs") {
      return { type: "sourceFile", filePath: SNARKJS_BRIDGE };
    }
    // Prefer the browser/ESM builds of the prover chain; their node builds pull in
    // the builtins above. conditionNames omits "node" so the node build is skipped.
    if (PROVER_DEPS.has(moduleName)) {
      return resolveWith(context, moduleName, platform, {
        unstable_conditionNames: ["browser", "import", "default"],
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
