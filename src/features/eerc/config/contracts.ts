// Hush eERC — Avalanche Fuji deployment (deployed 2026-06-03).
// Source of truth: eerc-deploy/deployments/fuji.json. We deploy our own converter
// so our key is owner + auditor (full auditorDecrypt visibility, off-frontend).

export const FUJI_CHAIN_ID = 43113 as const;

export const FUJI_RPC_URL =
  process.env.EXPO_PUBLIC_FUJI_RPC ??
  "https://api.avax-test.network/ext/bc/C/rpc";

export const CONTRACTS = {
  // Main converter eERC contract — passed to useEERC(contractAddress).
  encryptedERC: "0x2f7ca5848a4E075EDA36Ba0618b0317f1945648C",
  registrar: "0xf5FCF87A26670e2d3b4aE0af9887f909E817722E",
  // Public ERC20 wrapped via deposit (the demo "money").
  erc20: "0x291E3775A266E084b902cD61856234cb55F0ab64",
  babyJubJub: "0x87C9F114c7acb9c43df32768c46C5655A2e7bf5E",
  verifiers: {
    registration: "0xE249CFA122C73eaBcb7B305EaD67C79a08F6895E",
    mint: "0xF5512bf5d756D654B603ec83beA3f0169D2Fc0c0",
    withdraw: "0xf33CCc91290163384fe861ee541fb23DB6B6Bb90",
    transfer: "0xc233899E95698e3fF87bd2d14117be47Bdea297a",
    burn: "0xDa197120CAf4B9fAA23A22e222d748f294a35e7c",
  },
} as const;

// The converter eERC was deployed with 2 decimals.
export const EERC_DECIMALS = 2;

// Groth16 circuit artifacts (served from public/circuits — copied from
// eerc-deploy/zkit/artifacts; these MATCH the deployed verifiers). Shape =
// the SDK's CircuitURLs. `deposit` needs no proof, so it has no entry.
export const CIRCUIT_URLS = {
  register: { wasm: "/circuits/registration.wasm", zkey: "/circuits/registration.zkey" },
  transfer: { wasm: "/circuits/transfer.wasm", zkey: "/circuits/transfer.zkey" },
  mint: { wasm: "/circuits/mint.wasm", zkey: "/circuits/mint.zkey" },
  withdraw: { wasm: "/circuits/withdraw.wasm", zkey: "/circuits/withdraw.zkey" },
  burn: { wasm: "/circuits/burn.wasm", zkey: "/circuits/burn.zkey" },
} as const;
