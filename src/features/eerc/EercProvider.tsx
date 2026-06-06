import { createContext, useMemo, useState, type ReactNode } from "react";
import { EERC, Poseidon, useEERC } from "@avalabs/eerc-sdk";
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
import { CONTRACTS, EERC_DECIMALS } from "@/features/eerc/config/contracts";
import {
  DEFAULT_TOKEN,
  TOKENS,
  tokenByAddress,
  type TokenInfo,
} from "@/features/eerc/tokens/registry";
import { resolveTokenById } from "@/features/eerc/tokens/tokenResolver";
import {
  depositAbi,
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

// One token's decrypted balance for the UI.
export type TokenBalance = {
  token: TokenInfo;
  parsed: string; // decrypted balance with the converter's 6 dp applied ("" until decryptable)
  ready: boolean; // key set AND this token's encrypted balance loaded
};

export type EercContextValue = {
  status: EercStatus;
  // Wallet-init failure (e.g. couldn't reach Fuji); null while preparing or ok.
  walletError: string | null;
  address: `0x${string}` | null;
  isRegistered: boolean;
  // Whether the decryption key is loaded this session (gates balance decryption).
  isDecryptionKeySet: boolean;
  // Per-token balances — one entry per registry token.
  balances: TokenBalance[];
  balanceFor: (tokenAddress: string) => TokenBalance;
  // The default token's decrypted balance + readiness — convenience for single-
  // token callers; multi-token screens use balances/balanceFor.
  parsedBalance: string;
  balanceReady: boolean;
  // New users: derive key + send the on-chain registration tx.
  register: () => Promise<void>;
  // Returning users (no cached key, e.g. after reload): sign to unlock balance.
  enableDecryption: () => Promise<void>;
  // Money ops — tokenAddress defaults to the registry default (TEST) for callers
  // that haven't adopted the selector yet. Add money: mint (mintable tokens only),
  // approve, wrap. Cash out: exit to the underlying token. Send: confidential transfer.
  deposit: (
    humanAmount: string,
    tokenAddress?: string,
  ) => Promise<{ transactionHash: `0x${string}` }>;
  withdraw: (
    humanAmount: string,
    tokenAddress?: string,
  ) => Promise<{ transactionHash: `0x${string}` }>;
  send: (
    to: string,
    humanAmount: string,
    message?: string,
    tokenAddress?: string,
  ) => Promise<{ transactionHash: `0x${string}` }>;
  // Whether a recipient has registered for eERC (required before sending).
  isAddressRegistered: (address: `0x${string}`) => Promise<boolean>;
  // Decrypt YOUR amount for one payment AND which token it used — the token is
  // resolved on-chain from the tx calldata (never stored in the DB). null if
  // undecryptable.
  decryptAmount: (
    txHash: string,
    role: "sent" | "received" | "deposit" | "withdraw",
  ) => Promise<{ amount: string; token: TokenInfo } | null>;
  // Decrypt the end-to-end encrypted memo (sender & receiver only).
  decryptMemo: (txHash: string) => Promise<string | null>;
  // Encrypt an amount to a recipient's eERC pubkey (money requests) — 7-element PCT.
  encryptAmountFor: (toAddress: string, humanAmount: string) => Promise<string[]>;
  // Decrypt a request-amount PCT addressed to me (dollars string).
  decryptRequestAmount: (pct: string[]) => Promise<string | null>;
  refetchBalance: () => void;
  // Supabase auth binding (wallet → wallet_address JWT).
  supabaseStatus: SupabaseStatus;
  supabaseBoundWallet: string | null;
  supabaseError: string | null;
};

const EercContext = createContext<EercContextValue | null>(null);
export { EercContext };

const emptyBalance = (token: TokenInfo): TokenBalance => ({
  token,
  parsed: "",
  ready: false,
});

const PREPARING = (walletError: string | null): EercContextValue => ({
  status: "preparing",
  walletError,
  address: null,
  isRegistered: false,
  isDecryptionKeySet: false,
  balances: TOKENS.map(emptyBalance),
  balanceFor: () => emptyBalance(DEFAULT_TOKEN),
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
  encryptAmountFor: async () => {
    throw new Error("Wallet not ready.");
  },
  decryptRequestAmount: async () => null,
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

  // One encrypted-balance handle per registry token. TOKENS is a module constant,
  // so the hook count is stable across renders (rules-of-hooks safe).
  const handles = TOKENS.map((token) => ({
    token,
    bal: eerc.useEncryptedBalance(token.address),
  }));
  const handleFor = (tokenAddress: string) =>
    handles.find(
      (h) => h.token.address.toLowerCase() === tokenAddress.toLowerCase(),
    ) ?? handles[0];

  // A lightweight EERC instance for client-side crypto only (encrypt an amount to a
  // recipient's pubkey, fetch pubkeys).
  const cryptoErc = useMemo(
    () =>
      new EERC(
        publicClient,
        walletClient,
        CONTRACTS.encryptedERC as `0x${string}`,
        CONTRACTS.registrar as `0x${string}`,
        true,
        circuitUrls,
      ),
    [publicClient, walletClient, circuitUrls],
  );

  // Bind this wallet to Supabase (wallet → wallet_address JWT) once it's ready.
  const supabaseSession = useSupabaseSession(walletClient, address);

  const refetchBalance = () => handles.forEach((h) => h.bal.refetchBalance());

  // register() internally derives + sets the key, short-circuits if already
  // registered (no tx), else sends the registration proof tx.
  const register = async () => {
    await ensureFunded(publicClient, address);
    const { key } = await eerc.register();
    cacheDecryptionKey(address, key);
    setDecryptionKey(key);
    eerc.refetchEercUser();
    refetchBalance();
  };

  const enableDecryption = async () => {
    const key = await eerc.generateDecryptionKey();
    cacheDecryptionKey(address, key);
    setDecryptionKey(key);
    refetchBalance();
  };

  // Ensure the decryption key is loaded before any op that needs it (returns the
  // cached key in practice — the UI gates behind an unlock CTA).
  const ensureKey = async () => {
    if (eerc.isDecryptionKeySet && decryptionKey) return decryptionKey;
    const key = await eerc.generateDecryptionKey();
    cacheDecryptionKey(address, key);
    setDecryptionKey(key);
    return key;
  };

  // Add money: ensure tokens (faucet-mint for mintable tokens only — USDC is funded
  // by sending it in), approve the converter, then wrap into the encrypted balance.
  // Amount is entered in the token's OWN dp; the converter scales it to its 6 dp.
  const deposit = async (
    humanAmount: string,
    tokenAddress: string = DEFAULT_TOKEN.address,
  ) => {
    const { token, bal } = handleFor(tokenAddress);
    await ensureKey();
    const amount = parseUnits(humanAmount, token.decimals);
    if (token.mintable) await ensureTestBalance(publicClient, address, amount);
    const approveHash = await walletClient.writeContract({
      address: token.address,
      abi: erc20Abi,
      functionName: "approve",
      args: [CONTRACTS.encryptedERC as `0x${string}`, amount],
      account: address,
      chain: avalancheFuji,
    });
    await publicClient.waitForTransactionReceipt({ hash: approveHash });
    const result = await bal.deposit(amount);
    bal.refetchBalance();
    return { transactionHash: result.transactionHash };
  };

  // Cash out: exit the encrypted balance back to the underlying token. Amount is in
  // the converter's 6 dp (like send).
  const withdraw = async (
    humanAmount: string,
    tokenAddress: string = DEFAULT_TOKEN.address,
  ) => {
    const { bal } = handleFor(tokenAddress);
    await ensureKey();
    const amount = parseUnits(humanAmount, EERC_DECIMALS);
    const result = await bal.withdraw(amount);
    bal.refetchBalance();
    return { transactionHash: result.transactionHash };
  };

  // Confidential transfer with an optional encrypted memo. Amount is in the
  // converter's 6 dp.
  const send = async (
    to: string,
    humanAmount: string,
    message?: string,
    tokenAddress: string = DEFAULT_TOKEN.address,
  ) => {
    const { bal } = handleFor(tokenAddress);
    await ensureKey();
    const amount = parseUnits(humanAmount, EERC_DECIMALS);
    const result = await bal.privateTransfer(to, amount, message);
    bal.refetchBalance();
    return { transactionHash: result.transactionHash };
  };

  const isAddressRegistered = async (recipient: `0x${string}`) => {
    const { isRegistered } = await eerc.isAddressRegistered(recipient);
    return isRegistered;
  };

  // Decrypt YOUR amount for one payment AND which token it used. The token is
  // resolved on-chain from the tx calldata (deposit → tokenAddress arg; transfer/
  // withdraw → tokenId via tokenAddresses(id)) so the DB never reveals the currency
  // (F-12 privacy). Amount uses the token's dp for deposits (public), else the
  // converter's 6 dp.
  const decryptAmount = async (
    txHash: string,
    role: "sent" | "received" | "deposit" | "withdraw",
  ): Promise<{ amount: string; token: TokenInfo } | null> => {
    const key = await ensureKey();
    try {
      const tx = await publicClient.getTransaction({
        hash: txHash as `0x${string}`,
      });
      if (role === "deposit") {
        // deposit(amount, tokenAddress, amountPCT) — public amount at the token's dp.
        const { args } = decodeFunctionData({ abi: depositAbi, data: tx.input });
        const token = tokenByAddress(args[1] as string);
        if (!token) return null;
        return { amount: formatUnits(args[0] as bigint, token.decimals), token };
      }
      if (role === "withdraw") {
        // withdraw(tokenId, proof, …) — amount = proof.publicSignals[0] (6 dp).
        const { args } = decodeFunctionData({ abi: withdrawAbi, data: tx.input });
        const token = await resolveTokenById(publicClient, args[0] as bigint);
        if (!token) return null;
        const proof = args[1] as { publicSignals: readonly bigint[] };
        return {
          amount: formatUnits(
            proof.publicSignals[WITHDRAW_AMOUNT_SIGNAL],
            EERC_DECIMALS,
          ),
          token,
        };
      }
      // sent | received — transfer(to, tokenId, proof, …).
      const { args } = decodeFunctionData({ abi: transferAbi, data: tx.input });
      const token = await resolveTokenById(publicClient, args[1] as bigint);
      if (!token) return null;
      if (role === "received") {
        // the sender's per-tx amountPCT to us — proof.publicSignals[16..22].
        const proof = args[2] as { publicSignals: readonly bigint[] };
        const [start, end] = RECEIVER_AMOUNT_PCT_RANGE;
        const pct = proof.publicSignals.slice(start, end).map((x) => x.toString());
        return {
          amount: formatUnits(Poseidon.decryptAmountPCT(key, pct), EERC_DECIMALS),
          token,
        };
      }
      // sent: decryptTransaction on the token's handle → the PrivateTransfer delta.
      const events = await handleFor(token.address).bal.decryptTransaction(txHash);
      const e = events.find(
        (x) => x.eventType === "PrivateTransfer" && x.decryptedAmount,
      );
      return e?.decryptedAmount
        ? { amount: formatUnits(BigInt(e.decryptedAmount), EERC_DECIMALS), token }
        : null;
    } catch {
      return null;
    }
  };

  // The encrypted memo is on the transfer tx and decrypts for either party; the
  // default handle resolves it (it's token-agnostic — the message field, not the amount).
  const decryptMemo = async (txHash: string): Promise<string | null> => {
    await ensureKey();
    try {
      const meta = await handles[0].bal.decryptMessage(txHash);
      return meta.decryptedMessage || null;
    } catch {
      return null;
    }
  };

  // Encrypt an amount to a recipient's eERC public key → a 7-element Poseidon PCT
  // (money requests; readable only by the two parties — never in the DB plaintext).
  const encryptAmountFor = async (
    toAddress: string,
    humanAmount: string,
  ): Promise<string[]> => {
    const pubkey = await cryptoErc.fetchPublicKey(toAddress as `0x${string}`);
    if (pubkey[0] === 0n && pubkey[1] === 0n) {
      throw new Error("That address hasn't joined Hush yet.");
    }
    const amount = parseUnits(humanAmount, EERC_DECIMALS);
    const enc = await cryptoErc.poseidon.processPoseidonEncryption({
      inputs: [amount],
      publicKey: pubkey,
    });
    return [...enc.cipher, enc.authKey[0], enc.authKey[1], enc.nonce].map((x) =>
      x.toString(),
    );
  };

  // Decrypt a request-amount PCT addressed to me (dollars), behind the key gate.
  const decryptRequestAmount = async (
    pct: string[],
  ): Promise<string | null> => {
    const key = await ensureKey();
    try {
      return formatUnits(Poseidon.decryptAmountPCT(key, pct), EERC_DECIMALS);
    } catch {
      return null;
    }
  };

  const balances: TokenBalance[] = handles.map((h) => ({
    token: h.token,
    parsed: formatUnits(h.bal.decryptedBalance, EERC_DECIMALS),
    ready:
      eerc.isRegistered &&
      eerc.isDecryptionKeySet &&
      h.bal.encryptedBalance.length > 0,
  }));
  const balanceFor = (tokenAddress: string) =>
    balances.find(
      (b) => b.token.address.toLowerCase() === tokenAddress.toLowerCase(),
    ) ?? balances[0];
  const defaultBal = balanceFor(DEFAULT_TOKEN.address);

  const value: EercContextValue = {
    status: "ready",
    walletError: null,
    address,
    isRegistered: eerc.isRegistered,
    isDecryptionKeySet: eerc.isDecryptionKeySet,
    balances,
    balanceFor,
    parsedBalance: defaultBal.parsed,
    balanceReady: defaultBal.ready,
    register,
    enableDecryption,
    deposit,
    withdraw,
    send,
    isAddressRegistered,
    decryptAmount,
    decryptMemo,
    encryptAmountFor,
    decryptRequestAmount,
    refetchBalance,
    supabaseStatus: supabaseSession.status,
    supabaseBoundWallet: supabaseSession.boundWallet,
    supabaseError: supabaseSession.error,
  };

  return <EercContext.Provider value={value}>{children}</EercContext.Provider>;
}
