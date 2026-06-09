import { createConfig, http } from "wagmi";
import { avalancheFuji } from "wagmi/chains";
import { FUJI_RPC_URL } from "@/features/eerc/config/contracts";

// The eERC SDK calls wagmi hooks internally (e.g. useBlockNumber to refresh
// balances per block), so it needs a WagmiProvider with a Fuji transport. We
// don't register wagmi connectors — signing/sending goes through the viem
// wallet client built from the Privy embedded wallet, not wagmi accounts.
export const wagmiConfig = createConfig({
  chains: [avalancheFuji],
  // mipd (EIP-6963 injected-wallet discovery) calls window.addEventListener at
  // construction; React Native aliases window = global with no EventTarget, so
  // Hermes throws. Discovery only matters in a browser — gate it off natively.
  multiInjectedProviderDiscovery: typeof document !== "undefined",
  transports: {
    [avalancheFuji.id]: http(FUJI_RPC_URL),
  },
});
