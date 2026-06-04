import { createContext, useMemo, useState, type ReactNode } from "react";
import { useEERC } from "@avalabs/eerc-sdk";
import type { PublicClient, WalletClient } from "viem";
import { resolveCircuitUrls } from "@/features/eerc/circuits";
import { CONTRACTS } from "@/features/eerc/config/contracts";
import {
  cacheDecryptionKey,
  getCachedDecryptionKey,
} from "@/features/eerc/session";
import { ensureFunded } from "@/features/wallet/faucet";
import { useHushWallet } from "@/features/wallet/privyViemAdapter";

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
  // New users: derive key + send the on-chain registration tx.
  register: () => Promise<void>;
  // Returning users (no cached key, e.g. after reload): sign to unlock balance.
  enableDecryption: () => Promise<void>;
  refetchBalance: () => void;
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
  register: async () => {},
  enableDecryption: async () => {},
  refetchBalance: () => {},
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

  const value: EercContextValue = {
    status: "ready",
    walletError: null,
    address,
    isRegistered: eerc.isRegistered,
    isDecryptionKeySet: eerc.isDecryptionKeySet,
    parsedBalance: balance.parsedDecryptedBalance,
    register,
    enableDecryption,
    refetchBalance: balance.refetchBalance,
  };

  return <EercContext.Provider value={value}>{children}</EercContext.Provider>;
}
