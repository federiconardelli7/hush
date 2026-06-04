import { CIRCUIT_URLS } from "@/features/eerc/config/contracts";

type CircuitPair = { wasm: string; zkey: string };
type CircuitUrls = {
  register: CircuitPair;
  transfer: CircuitPair;
  mint: CircuitPair;
  withdraw: CircuitPair;
  burn: CircuitPair;
};

// The eERC SDK passes circuit paths straight to `new URL(path)`, and only adds a
// base when the path starts with "/" — using `import.meta.url`, which is not a
// valid base in the Metro web bundle, so a relative "/circuits/..." throws
// "Invalid base URL". Resolve every path to an absolute URL against the web
// origin (works for localhost and the deployed domain alike).
function toAbsolute(path: string): string {
  if (path.startsWith("http")) {
    return path;
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return new URL(path, window.location.origin).toString();
  }
  return path;
}

export function resolveCircuitUrls(): CircuitUrls {
  const map = (pair: CircuitPair): CircuitPair => ({
    wasm: toAbsolute(pair.wasm),
    zkey: toAbsolute(pair.zkey),
  });
  return {
    register: map(CIRCUIT_URLS.register),
    transfer: map(CIRCUIT_URLS.transfer),
    mint: map(CIRCUIT_URLS.mint),
    withdraw: map(CIRCUIT_URLS.withdraw),
    burn: map(CIRCUIT_URLS.burn),
  };
}
