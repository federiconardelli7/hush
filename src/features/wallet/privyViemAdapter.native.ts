import { useEffect, useMemo, useRef, useState } from "react";
import {
  useEmbeddedEthereumWallet,
  usePrivy,
  type ConnectedEthereumWallet,
} from "@privy-io/expo";
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type PublicClient,
  type WalletClient,
} from "viem";
import { avalancheFuji } from "viem/chains";
import { FUJI_RPC_URL } from "@/features/eerc/config/contracts";

// Contract kept identical to privyViemAdapter.ts (web). Duplicated intentionally
// (small, stable union) so the two platform variants stay independent — keep in sync.
export type HushWallet =
  | {
      ready: false;
      address: null;
      publicClient: null;
      walletClient: null;
      error: string | null;
    }
  | {
      ready: true;
      address: `0x${string}`;
      publicClient: PublicClient;
      walletClient: WalletClient;
      error: null;
    };

// Native (@privy-io/expo) counterpart of privyViemAdapter.ts. The embedded wallet
// comes from useEmbeddedEthereumWallet(); its EIP-1193 provider (wallet.getProvider())
// feeds viem's custom() transport, exactly like the web adapter. The wallet defaults
// to Fuji (the only supportedChain — see PrivyProviderWrapper.native), so there's no
// explicit switchChain. The effect is keyed on the stable address string because the
// wallet object identity isn't stable across renders (same reasoning as web, D-5).
export function useHushWallet(): HushWallet {
  const { user } = usePrivy();
  const authenticated = user !== null;
  const { wallets, create } = useEmbeddedEthereumWallet();
  const embedded = wallets.length > 0 ? wallets[0] : undefined;
  const address = embedded?.address as `0x${string}` | undefined;

  const walletRef = useRef<ConnectedEthereumWallet | null>(null);
  walletRef.current = embedded ?? null;

  const [walletClient, setWalletClient] = useState<WalletClient | null>(null);
  const [readyAddress, setReadyAddress] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);

  const publicClient = useMemo<PublicClient>(
    () =>
      createPublicClient({
        chain: avalancheFuji,
        transport: http(FUJI_RPC_URL),
      }),
    [],
  );

  // Create the embedded wallet once if the authenticated user doesn't have one.
  const creatingRef = useRef(false);
  useEffect(() => {
    if (!authenticated || embedded || creatingRef.current) {
      return;
    }
    creatingRef.current = true;
    void (async () => {
      try {
        await create();
      } catch (err) {
        creatingRef.current = false; // allow a retry on a later render
        setError(
          `Couldn't create your wallet: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    })();
  }, [authenticated, embedded, create]);

  // Build the viem wallet client once the embedded wallet exists.
  useEffect(() => {
    const wallet = walletRef.current;
    if (!wallet || !address) {
      setWalletClient(null);
      setReadyAddress(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const provider = await wallet.getProvider();
        if (cancelled) return;
        setWalletClient(
          createWalletClient({
            account: address,
            chain: avalancheFuji,
            transport: custom(provider),
          }),
        );
        setReadyAddress(address);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setWalletClient(null);
        setReadyAddress(null);
        setError(
          `Couldn't initialise your wallet on Fuji: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [address]);

  if (!walletClient || !readyAddress) {
    return {
      ready: false,
      address: null,
      publicClient: null,
      walletClient: null,
      error,
    };
  }
  return {
    ready: true,
    address: readyAddress,
    publicClient,
    walletClient,
    error: null,
  };
}
