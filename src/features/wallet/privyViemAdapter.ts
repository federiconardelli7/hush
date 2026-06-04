import { useEffect, useMemo, useRef, useState } from "react";
import {
  getEmbeddedConnectedWallet,
  useCreateWallet,
  usePrivy,
  useWallets,
  type ConnectedWallet,
} from "@privy-io/react-auth";
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type PublicClient,
  type WalletClient,
} from "viem";
import { avalancheFuji } from "viem/chains";
import { FUJI_CHAIN_ID, FUJI_RPC_URL } from "@/features/eerc/config/contracts";

// What the eERC layer consumes. Discriminated on `ready` so callers can't read
// a half-built client: useEERC needs concrete public + wallet clients.
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

const FUJI_CAIP2 = `eip155:${FUJI_CHAIN_ID}`;

// Bridges the Privy embedded wallet (EIP-1193) to the viem clients the eERC SDK
// expects. The wallet client signs + sends through Privy; the public client
// reads Fuji over plain HTTP.
//
// Note: we log in with the headless `loginWithCode` flow, and Privy's
// `createOnLogin` only auto-creates the embedded wallet for its own modal — not
// for headless logins. So we create the embedded wallet ourselves once the user
// is authenticated, then build the clients in an effect keyed on the address (a
// stable string) since the embedded-wallet object identity isn't stable.
export function useHushWallet(): HushWallet {
  const { authenticated } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const { createWallet } = useCreateWallet();
  const embedded = getEmbeddedConnectedWallet(wallets);
  const address = embedded?.address as `0x${string}` | undefined;

  const walletRef = useRef<ConnectedWallet | null>(null);
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
    if (!authenticated || !walletsReady || embedded || creatingRef.current) {
      return;
    }
    creatingRef.current = true;
    void (async () => {
      try {
        await createWallet();
      } catch (err) {
        creatingRef.current = false; // allow a retry on a later render
        setError(
          `Couldn't create your wallet: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    })();
  }, [authenticated, walletsReady, embedded, createWallet]);

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
        if (wallet.chainId !== FUJI_CAIP2) {
          await wallet.switchChain(FUJI_CHAIN_ID);
        }
        const provider = await wallet.getEthereumProvider();
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
