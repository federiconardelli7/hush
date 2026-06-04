import { createConfig, http } from "wagmi";
import { avalancheFuji } from "wagmi/chains";
import { FUJI_RPC_URL } from "@/features/eerc/config/contracts";

// The eERC SDK calls wagmi hooks internally (e.g. useBlockNumber to refresh
// balances per block), so it needs a WagmiProvider with a Fuji transport. We
// don't register wagmi connectors — signing/sending goes through the viem
// wallet client built from the Privy embedded wallet, not wagmi accounts.
export const wagmiConfig = createConfig({
  chains: [avalancheFuji],
  transports: {
    [avalancheFuji.id]: http(FUJI_RPC_URL),
  },
});
