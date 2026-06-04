// Minimal ABI for the eERC converter's `transfer`, used to decode a RECEIVED
// transfer's calldata and recover the receiver's amount ciphertext.
//
// Every transfer encrypts the amount to the receiver as a per-transaction
// Poseidon ciphertext (`amountPCT`, 7 field elements). It is carried in the
// proof's public signals at indices 16..22 — verified against the deployed
// transfer circuit (EncryptedERC.sol: `transferInputs.amountPCT[i] = input[16+i]`,
// 32 public signals). Decoding the calldata gives an immutable, per-tx source
// (on-chain storage `amountPCTs[]` is cleared on the receiver's next send).
//
// IMPORTANT: this offset is bound to the deployed transfer circuit. Re-check it
// if the converter/circuits are ever redeployed (see ARCHITECTURE.md F-12).
export const RECEIVER_AMOUNT_PCT_RANGE = [16, 23] as const;

const proofComponent = {
  name: "proof",
  type: "tuple",
  internalType: "struct TransferProof",
  components: [
    {
      name: "proofPoints",
      type: "tuple",
      internalType: "struct ProofPoints",
      components: [
        { name: "a", type: "uint256[2]", internalType: "uint256[2]" },
        { name: "b", type: "uint256[2][2]", internalType: "uint256[2][2]" },
        { name: "c", type: "uint256[2]", internalType: "uint256[2]" },
      ],
    },
    { name: "publicSignals", type: "uint256[32]", internalType: "uint256[32]" },
  ],
} as const;

// Both overloads (with and without the encrypted memo `message`). Hush sends use
// the `message` variant; decodeFunctionData resolves the right one by selector.
export const transferAbi = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    outputs: [],
    inputs: [
      { name: "to", type: "address", internalType: "address" },
      { name: "tokenId", type: "uint256", internalType: "uint256" },
      proofComponent,
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
      proofComponent,
      { name: "balancePCT", type: "uint256[7]", internalType: "uint256[7]" },
      { name: "message", type: "bytes", internalType: "bytes" },
    ],
  },
] as const;
