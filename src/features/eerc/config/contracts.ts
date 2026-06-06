// Hush eERC — Avalanche Fuji deployment. Converter REDEPLOYED 2026-06-06 at
// decimals=6 (matches USDC; F-12 Phase 1). Source of truth:
// eerc-deploy/deployments/fuji.json. We deploy our own converter so our key is
// owner + auditor (full auditorDecrypt visibility, off-frontend).

export const FUJI_CHAIN_ID = 43113 as const;

export const FUJI_RPC_URL =
  process.env.EXPO_PUBLIC_FUJI_RPC ??
  "https://api.avax-test.network/ext/bc/C/rpc";

export const CONTRACTS = {
  // Main converter eERC contract — passed to useEERC(contractAddress).
  encryptedERC: "0x0D423fb132Db39886A757BC21c895B43f24b2661",
  registrar: "0xD2Ad4aAA9D09A720025ECe959eCa98bA1EE4958e",
  // Public ERC20 wrapped via deposit (the demo "money" — TEST, 18 dp, open-mint).
  erc20: "0xb636Caab9650eE6300436185551EEcadbd5c3079",
  // Real Circle USDC on Fuji (6 dp) — F-12 multi-token (Phase 2). Verified on-chain.
  usdc: "0x5425890298aed601595a70AB815c96711a31Bc65",
  babyJubJub: "0xEFA2c8700c569Ad280823Fd1DE0c5680Ab626403",
  verifiers: {
    registration: "0xE2881af0F0DbA27F4BC269a74f74dcaffCe091B1",
    mint: "0x11fCcfaAfa2A7F020FA078448cA04deC05D70Da5",
    withdraw: "0x24C4620Cb5E33D2B3Ce742C8Ff5edC576E785C07",
    transfer: "0xcd7337d5239F3215e83aa7d4868B783A70e67e12",
    burn: "0xc7e09526D0f0793fe03a051af12D00ce46A9F57A",
  },
} as const;

// The converter eERC was deployed with 6 decimals (matches USDC; F-12). The UI
// still shows/accepts cents — the extra precision sits unused for Hush-originated
// amounts and faithfully holds odd-precision USDC received from outside.
export const EERC_DECIMALS = 6;

// The underlying public TEST ERC20 has 18 decimals; deposit/approve amounts are
// expressed in these (the converter scales 18 dp -> its 6 dp internally).
export const ERC20_DECIMALS = 18;

// Groth16 circuit artifacts (served from public/circuits — copied from
// eerc-deploy/zkit/artifacts; the circuits are unchanged by the redeploy, so they
// still MATCH the new verifiers). Shape = the SDK's CircuitURLs. `deposit` needs
// no proof, so it has no entry.
export const CIRCUIT_URLS = {
  register: { wasm: "/circuits/registration.wasm", zkey: "/circuits/registration.zkey" },
  transfer: { wasm: "/circuits/transfer.wasm", zkey: "/circuits/transfer.zkey" },
  mint: { wasm: "/circuits/mint.wasm", zkey: "/circuits/mint.zkey" },
  withdraw: { wasm: "/circuits/withdraw.wasm", zkey: "/circuits/withdraw.zkey" },
  burn: { wasm: "/circuits/burn.wasm", zkey: "/circuits/burn.zkey" },
} as const;
