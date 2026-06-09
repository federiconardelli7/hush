// Served AS the `snarkjs` module on native by metro.config.js. Stock Hermes has
// no WebAssembly, so Groth16 runs inside the ProverHost WebView (System WebView
// has WASM). The eERC SDK uses exactly these two groth16 functions at one call
// site (dist/index.js: `import * as e0 from 'snarkjs'`). Web keeps real snarkjs.
// This module must not import React.
import { submitJob } from "@/features/eerc/prover/proverRegistry";

// snarkjs accepts decimal-string field elements wherever bigints are valid, so
// BigInts survive the JSON postMessage boundary as strings.
function toJsonSafe(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(toJsonSafe);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, toJsonSafe(v)]),
    );
  }
  return value;
}

export const groth16 = {
  async fullProve(
    input: unknown,
    wasmUrl: unknown,
    zkeyUrl: unknown,
  ): Promise<{ proof: unknown; publicSignals: unknown }> {
    const result = await submitJob("fullProve", {
      input: toJsonSafe(input),
      wasmUrl: String(wasmUrl),
      zkeyUrl: String(zkeyUrl),
    });
    return result as { proof: unknown; publicSignals: unknown };
  },

  async exportSolidityCallData(proof: unknown, publicSignals: unknown): Promise<string> {
    const result = await submitJob("calldata", {
      proof: toJsonSafe(proof),
      publicSignals: toJsonSafe(publicSignals),
    });
    return result as string;
  },
};
