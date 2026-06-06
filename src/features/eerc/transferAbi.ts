// Minimal ABIs for decoding eERC tx calldata to recover amounts that the SDK's
// decryptTransaction doesn't surface correctly.
//
// - transfer: the receiver's amount is encrypted to them as a per-tx amountPCT
//   (Poseidon ciphertext) carried in proof.publicSignals[16..22] — verified
//   against the deployed transfer circuit (EncryptedERC.sol:1151, 32 signals).
// - withdraw: the (public) amount is proof.publicSignals[0] (EncryptedERC.sol:1052,
//   16 signals). The SDK's decryptTransaction returns args[0], which is the
//   tokenId, NOT the amount — so we decode the calldata ourselves.
//
// IMPORTANT: these offsets/sizes are bound to the deployed circuits. Re-check them
// if the converter/circuits are ever redeployed (see ARCHITECTURE.md F-12).
export const RECEIVER_AMOUNT_PCT_RANGE = [16, 23] as const;
export const WITHDRAW_AMOUNT_SIGNAL = 0;

const proofPoints = {
  name: "proofPoints",
  type: "tuple",
  internalType: "struct ProofPoints",
  components: [
    { name: "a", type: "uint256[2]", internalType: "uint256[2]" },
    { name: "b", type: "uint256[2][2]", internalType: "uint256[2][2]" },
    { name: "c", type: "uint256[2]", internalType: "uint256[2]" },
  ],
} as const;

const transferProof = {
  name: "proof",
  type: "tuple",
  internalType: "struct TransferProof",
  components: [
    proofPoints,
    { name: "publicSignals", type: "uint256[32]", internalType: "uint256[32]" },
  ],
} as const;

const withdrawProof = {
  name: "proof",
  type: "tuple",
  internalType: "struct WithdrawProof",
  components: [
    proofPoints,
    { name: "publicSignals", type: "uint256[16]", internalType: "uint256[16]" },
  ],
} as const;

// Both overloads (with and without the encrypted memo `message`); decodeFunctionData
// resolves the right one by selector.
export const transferAbi = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    outputs: [],
    inputs: [
      { name: "to", type: "address", internalType: "address" },
      { name: "tokenId", type: "uint256", internalType: "uint256" },
      transferProof,
      { name: "balancePCT", type: "uint256[7]", internalType: "uint256[7]" },
    ],
  },
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    outputs: [],
    inputs: [
      { name: "to", type: "address", internalType: "address" },
      { name: "tokenId", type: "uint256", internalType: "uint256" },
      transferProof,
      { name: "balancePCT", type: "uint256[7]", internalType: "uint256[7]" },
      { name: "message", type: "bytes", internalType: "bytes" },
    ],
  },
] as const;

export const withdrawAbi = [
  {
    type: "function",
    name: "withdraw",
    stateMutability: "nonpayable",
    outputs: [],
    inputs: [
      { name: "tokenId", type: "uint256", internalType: "uint256" },
      withdrawProof,
      { name: "balancePCT", type: "uint256[7]", internalType: "uint256[7]" },
    ],
  },
  {
    type: "function",
    name: "withdraw",
    stateMutability: "nonpayable",
    outputs: [],
    inputs: [
      { name: "tokenId", type: "uint256", internalType: "uint256" },
      withdrawProof,
      { name: "balancePCT", type: "uint256[7]", internalType: "uint256[7]" },
      { name: "message", type: "bytes", internalType: "bytes" },
    ],
  },
] as const;

// deposit(amount, tokenAddress, amountPCT) — decode the calldata to read the public
// deposit amount (args[0], in the token's OWN dp) and which token (args[1]) directly,
// without a Deposit-event lookup. F-12 multi-token: tells Activity which token a
// deposit used.
export const depositAbi = [
  {
    type: "function",
    name: "deposit",
    stateMutability: "nonpayable",
    outputs: [],
    inputs: [
      { name: "amount", type: "uint256", internalType: "uint256" },
      { name: "tokenAddress", type: "address", internalType: "address" },
      { name: "amountPCT", type: "uint256[7]", internalType: "uint256[7]" },
    ],
  },
] as const;
