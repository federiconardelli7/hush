// The token registry — the single source of truth for which ERC20s Hush wraps
// through the eERC converter. The EercProvider maps over TOKENS to instantiate one
// encrypted-balance handle per token, so this array's length MUST stay stable at
// runtime (rules-of-hooks). All tokens share the converter's internal 6 dp for
// their encrypted balance; `decimals` here is each token's OWN dp (used only for
// the public deposit/approve amount, which the converter scales to 6 dp). F-12.
import { CONTRACTS } from "@/features/eerc/config/contracts";

export type TokenInfo = {
  address: `0x${string}`;
  // The ERC20's own decimals — the deposit/approve amount scale (converter → 6 dp).
  decimals: number;
  symbol: string;
  label: string;
  // mintable: the in-app faucet can mint it (TEST). false (USDC) → fund by sending in.
  mintable: boolean;
  // usdPegged: render as "$"; a future non-dollar token (AVAX, F-16) → "<amt> SYMBOL".
  usdPegged: boolean;
};

export const TOKENS: readonly TokenInfo[] = [
  {
    address: CONTRACTS.erc20 as `0x${string}`,
    decimals: 18,
    symbol: "TEST",
    label: "Test dollars",
    mintable: true,
    usdPegged: true,
  },
  {
    address: CONTRACTS.usdc as `0x${string}`,
    decimals: 6,
    symbol: "USDC",
    label: "USDC",
    mintable: false,
    usdPegged: true,
  },
] as const;

// Default token for "Add money" — the only one with a free in-app faucet.
export const DEFAULT_TOKEN = TOKENS[0];

export function tokenByAddress(address?: string): TokenInfo | undefined {
  if (!address) return undefined;
  const a = address.toLowerCase();
  return TOKENS.find((t) => t.address.toLowerCase() === a);
}
