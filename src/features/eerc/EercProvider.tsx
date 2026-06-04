import { createContext, useMemo, useState, type ReactNode } from "react";
import { Poseidon, useEERC } from "@avalabs/eerc-sdk";
import {
  decodeFunctionData,
  erc20Abi,
  formatUnits,
  parseUnits,
  type PublicClient,
  type WalletClient,
} from "viem";
import { avalancheFuji } from "viem/chains";
import { resolveCircuitUrls } from "@/features/eerc/circuits";
import {
  CONTRACTS,
  EERC_DECIMALS,
  ERC20_DECIMALS,
} from "@/features/eerc/config/contracts";
import {
  RECEIVER_AMOUNT_PCT_RANGE,
  transferAbi,
  WITHDRAW_AMOUNT_SIGNAL,
  withdrawAbi,
} from "@/features/eerc/transferAbi";
import {
  cacheDecryptionKey,
  getCachedDecryptionKey,
} from "@/features/eerc/session";
import { ensureFunded, ensureTestBalance } from "@/features/wallet/faucet";
import { useHushWallet } from "@/features/wallet/privyViemAdapter";
import {
  useSupabaseSession,
  type SupabaseStatus,
} from "@/features/supabase/useSupabaseSession";

export type EercStatus = "preparing" | "ready";

export type EercContextValue = {
  status: EercStatus;
  // Wallet-init failure (e.g. couldn't reach Fuji); null while preparing or ok.
  walletError: string | null;
  address: `0x${string}` | null;
  isRegistered: boolean;
  // Whether the decryption key is loaded this session (gates balance decryption).
  isDecryptionKeySet: boolean;
  // Human-readable decrypted balance (decimals applied); "" until decryptable.
  parsedBalance: string;
  // True once the key is set AND the encrypted balance is loaded — required
  // before a transfer (the SDK errors otherwise).
  balanceReady: boolean;
  // New users: derive key + send the on-chain registration tx.
  register: () => Promise<void>;
  // Returning users (no cached key, e.g. after reload): sign to unlock balance.
  enableDecryption: () => Promise<void>;
  // Add money: mint test tokens if needed, approve, and wrap into the balance.
  deposit: (humanAmount: string) => Promise<{ transactionHash: `0x${string}` }>;
  // Cash out: exit the encrypted balance back to the underlying token (amount in $).
  withdraw: (humanAmount: string) => Promise<{ transactionHash: `0x${string}` }>;
  // Send a confidential payment with an optional encrypted memo (amount in $).
  send: (
    to: string,
    humanAmount: string,
    message?: string,
  ) => Promise<{ transactionHash: `0x${string}` }>;
  // Whether a recipient has registered for eERC (required before sending).
  isAddressRegistered: (address: `0x${string}`) => Promise<boolean>;
  // Decrypt YOUR own amount for a payment (dollars string), client-side: sent →
  // sender balance delta; received → the per-tx amountPCT. null if undecryptable.
  decryptAmount: (
    txHash: string,
    role: "sent" | "received" | "deposit" | "withdraw",
  ) => Promise<string | null>;
  // Decrypt the end-to-end encrypted memo (sender & receiver only).
  decryptMemo: (txHash: string) => Promise<string | null>;
  refetchBalance: () => void;
  // Supabase auth binding (wallet → wallet_address JWT). boundWallet is what RLS
  // sees via current_wallet() — confirms the claim round-trips.
  supabaseStatus: SupabaseStatus;
  supabaseBoundWallet: string | null;
  supabaseError: string | null;
};

const EercContext = createContext<EercContextValue | null>(null);
export { EercContext };

const PREPARING = (walletError: string | null): EercContextValue => ({
  status: "preparing",
  walletError,
  address: null,
  isRegistered: false,
  isDecryptionKeySet: false,
  parsedBalance: "",
  balanceReady: false,
  register: async () => {},
  enableDecryption: async () => {},
  deposit: async () => {
    throw new Error("Wallet not ready.");
  },
  withdraw: async () => {
    throw new Error("Wallet not ready.");
  },
  send: async () => {
    throw new Error("Wallet not ready.");
  },
  isAddressRegistered: async () => false,
  decryptAmount: async () => null,
  decryptMemo: async () => null,
  refetchBalance: () => {},
  supabaseStatus: "idle",
  supabaseBoundWallet: null,
  supabaseError: null,
});

// Outer gate: useEERC requires concrete viem clients, so the inner component
// (which calls the SDK hooks unconditionally) is only mounted once the embedded
// wallet is ready. Until then we serve a "preparing" context so the tree mounts.
export function EercProvider({ children }: { children: ReactNode }) {
  const wallet = useHushWallet();

  if (!wallet.ready) {
    return (
      <EercContext.Provider value={PREPARING(wallet.error)}>
        {children}
      </EercContext.Provider>
    );
  }

  return (
    <EercReady
      address={wallet.address}
      publicClient={wallet.publicClient}
      walletClient={wallet.walletClient}
    >
      {children}
    </EercReady>
  );
}

function EercReady({
  address,
  publicClient,
  walletClient,
  children,
}: {
  address: `0x${string}`;
  publicClient: PublicClient;
  walletClient: WalletClient;
  children: ReactNode;
}) {
  // Seed the SDK with a key cached earlier this session so returning users
  // decrypt their balance without signing again.
  const [decryptionKey, setDecryptionKey] = useState<string | undefined>(() =>
    getCachedDecryptionKey(address),
  );

  // Absolute circuit URLs (relative paths throw "Invalid base URL" in the SDK).
  const circuitUrls = useMemo(() => resolveCircuitUrls(), []);

  const eerc = useEERC(
    publicClient,
    walletClient,
    CONTRACTS.encryptedERC,
    circuitUrls,
    decryptionKey,
  );
  const balance = eerc.useEncryptedBalance(CONTRACTS.erc20);

  // Bind this wallet to Supabase (wallet → wallet_address JWT) once it's ready.
  const supabaseSession = useSupabaseSession(walletClient, address);

  // register() internally derives + sets the key, short-circuits if already
  // registered (no tx), else sends the registration proof tx.
  const register = async () => {
    // Drip gas to the fresh embedded wallet first — register sends a real tx.
    await ensureFunded(publicClient, address);
    const { key } = await eerc.register();
    cacheDecryptionKey(address, key);
    setDecryptionKey(key);
    eerc.refetchEercUser();
    balance.refetchBalance();
  };

  const enableDecryption = async () => {
    const key = await eerc.generateDecryptionKey();
    cacheDecryptionKey(address, key);
    setDecryptionKey(key);
    balance.refetchBalance();
  };

  // Add money: ensure test tokens, approve the converter, then wrap into the
  // encrypted balance. Amount is entered in dollars and held at the token's dp.
  const deposit = async (humanAmount: string) => {
    // deposit encrypts the amount to your public key, so the key must be set
    // (cleared on reload) — derive it first if needed.
    if (!eerc.isDecryptionKeySet) {
      const key = await eerc.generateDecryptionKey();
      cacheDecryptionKey(address, key);
      setDecryptionKey(key);
    }
    const amount = parseUnits(humanAmount, ERC20_DECIMALS);
    await ensureTestBalance(publicClient, address, amount);
    const approveHash = await walletClient.writeContract({
      address: CONTRACTS.erc20 as `0x${string}`,
      abi: erc20Abi,
      functionName: "approve",
      args: [CONTRACTS.encryptedERC as `0x${string}`, amount],
      account: address,
      chain: avalancheFuji,
    });
    await publicClient.waitForTransactionReceipt({ hash: approveHash });
    const result = await balance.deposit(amount);
    balance.refetchBalance();
    return { transactionHash: result.transactionHash };
  };

  // Cash out: exit the encrypted balance back to the underlying token. Amount is
  // in the converter's 2 dp (like send, NOT deposit's 18) — withdraw subtracts it
  // from the decrypted balance. Needs the key + a loaded balance (gated by the UI).
  const withdraw = async (humanAmount: string) => {
    if (!eerc.isDecryptionKeySet) {
      const key = await eerc.generateDecryptionKey();
      cacheDecryptionKey(address, key);
      setDecryptionKey(key);
    }
    const amount = parseUnits(humanAmount, EERC_DECIMALS);
    const result = await balance.withdraw(amount);
    balance.refetchBalance();
    return { transactionHash: result.transactionHash };
  };

  // privateTransfer amount is in the converter's decimals (2), unlike deposit.
  const send = async (to: string, humanAmount: string, message?: string) => {
    if (!eerc.isDecryptionKeySet) {
      const key = await eerc.generateDecryptionKey();
      cacheDecryptionKey(address, key);
      setDecryptionKey(key);
    }
    const amount = parseUnits(humanAmount, EERC_DECIMALS);
    const result = await balance.privateTransfer(to, amount, message);
    balance.refetchBalance();
    return { transactionHash: result.transactionHash };
  };

  const isAddressRegistered = async (recipient: `0x${string}`) => {
    const { isRegistered } = await eerc.isAddressRegistered(recipient);
    return isRegistered;
  };

  // Ensure the decryption key is loaded before any decrypt (same guard as
  // send/deposit). Activity also gates this behind an unlock CTA, so in practice
  // this returns the cached key — no per-row signing.
  const ensureKey = async () => {
    if (eerc.isDecryptionKeySet && decryptionKey) return decryptionKey;
    const key = await eerc.generateDecryptionKey();
    cacheDecryptionKey(address, key);
    setDecryptionKey(key);
    return key;
  };

  // Decrypt YOUR amount for one payment. decryptTransaction is sender-side (a
  // balance delta) so it only yields the SENT amount; for RECEIVED payments we
  // decrypt the per-tx amountPCT the sender encrypted to us
  // (proof.publicSignals[16..22]) via the SDK's exported Poseidon helper. Both
  // return a dollar string with the converter's decimals applied.
  const decryptAmount = async (
    txHash: string,
    role: "sent" | "received" | "deposit" | "withdraw",
  ): Promise<string | null> => {
    const key = await ensureKey();
    try {
      // received & withdraw amounts are public signals in the tx calldata — the
      // SDK's decryptTransaction doesn't surface them correctly (received: N/A;
      // withdraw: it returns args[0], which is the tokenId, not the amount).
      if (role === "received" || role === "withdraw") {
        const tx = await publicClient.getTransaction({
          hash: txHash as `0x${string}`,
        });
        if (role === "withdraw") {
          // withdraw amount = proof.publicSignals[0] (converter's 2 dp).
          const { args } = decodeFunctionData({
            abi: withdrawAbi,
            data: tx.input,
          });
          const proof = args[1] as { publicSignals: readonly bigint[] };
          return formatUnits(
            proof.publicSignals[WITHDRAW_AMOUNT_SIGNAL],
            EERC_DECIMALS,
          );
        }
        // received: the sender encrypts the amount to us as a per-tx amountPCT
        // in the transfer calldata (proof.publicSignals[16..22]).
        const { args } = decodeFunctionData({ abi: transferAbi, data: tx.input });
        const proof = args[2] as { publicSignals: readonly bigint[] };
        const [start, end] = RECEIVER_AMOUNT_PCT_RANGE;
        const pct = proof.publicSignals
          .slice(start, end)
          .map((x) => x.toString());
        return formatUnits(Poseidon.decryptAmountPCT(key, pct), EERC_DECIMALS);
      }
      // sent & deposit come from decryptTransaction.
      const events = await balance.decryptTransaction(txHash);
      if (role === "sent") {
        const e = events.find(
          (x) => x.eventType === "PrivateTransfer" && x.decryptedAmount,
        );
        return e?.decryptedAmount
          ? formatUnits(BigInt(e.decryptedAmount), EERC_DECIMALS)
          : null;
      }
      // deposit: the public token amount is the Deposit event's amount (args[0], 18 dp).
      const e = events.find((x) => x.eventType === "Deposit" && x.amount);
      return e?.amount ? formatUnits(BigInt(e.amount), ERC20_DECIMALS) : null;
    } catch {
      return null;
    }
  };

  // The encrypted memo is encrypted to both parties, so it decrypts for the
  // sender and the receiver alike.
  const decryptMemo = async (txHash: string): Promise<string | null> => {
    await ensureKey();
    try {
      const meta = await balance.decryptMessage(txHash);
      return meta.decryptedMessage || null;
    } catch {
      return null;
    }
  };

  const value: EercContextValue = {
    status: "ready",
    walletError: null,
    address,
    isRegistered: eerc.isRegistered,
    isDecryptionKeySet: eerc.isDecryptionKeySet,
    parsedBalance: formatUnits(balance.decryptedBalance, EERC_DECIMALS),
    balanceReady:
      eerc.isRegistered &&
      eerc.isDecryptionKeySet &&
      balance.encryptedBalance.length > 0,
    register,
    enableDecryption,
    deposit,
    withdraw,
    send,
    isAddressRegistered,
    decryptAmount,
    decryptMemo,
    refetchBalance: balance.refetchBalance,
    supabaseStatus: supabaseSession.status,
    supabaseBoundWallet: supabaseSession.boundWallet,
    supabaseError: supabaseSession.error,
  };

  return <EercContext.Provider value={value}>{children}</EercContext.Provider>;
}
