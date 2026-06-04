import { createContext, useMemo, useState, type ReactNode } from "react";
import { useEERC } from "@avalabs/eerc-sdk";
import {
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
  deposit: (humanAmount: string) => Promise<void>;
  // Send a confidential payment with an optional encrypted memo (amount in $).
  send: (
    to: string,
    humanAmount: string,
    message?: string,
  ) => Promise<{ transactionHash: `0x${string}` }>;
  // Whether a recipient has registered for eERC (required before sending).
  isAddressRegistered: (address: `0x${string}`) => Promise<boolean>;
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
  deposit: async () => {},
  send: async () => {
    throw new Error("Wallet not ready.");
  },
  isAddressRegistered: async () => false,
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
    await balance.deposit(amount);
    balance.refetchBalance();
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
    send,
    isAddressRegistered,
    refetchBalance: balance.refetchBalance,
    supabaseStatus: supabaseSession.status,
    supabaseBoundWallet: supabaseSession.boundWallet,
    supabaseError: supabaseSession.error,
  };

  return <EercContext.Provider value={value}>{children}</EercContext.Provider>;
}
