import type { PublicClient } from "viem";
import { CONTRACTS } from "@/features/eerc/config/contracts";
import { tokenByAddress, type TokenInfo } from "@/features/eerc/tokens/registry";

// The converter (TokenTracker) maps each registered ERC20 to a uint256 tokenId and
// back. To learn which token a tx used WITHOUT storing it in the DB (F-12 privacy),
// we decode the tokenId from the tx calldata and read tokenAddresses(id) here, then
// look it up in the registry.
const tokenTrackerAbi = [
  {
    type: "function",
    name: "tokenAddresses",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

// tokenId → address is fixed once a token is registered on-chain, so cache resolved
// tokens forever (only ~2 distinct ids). Transient read failures aren't cached.
const cache = new Map<string, TokenInfo>();

export async function resolveTokenById(
  publicClient: PublicClient,
  tokenId: bigint,
): Promise<TokenInfo | undefined> {
  const key = tokenId.toString();
  const hit = cache.get(key);
  if (hit) return hit;
  try {
    const address = (await publicClient.readContract({
      address: CONTRACTS.encryptedERC as `0x${string}`,
      abi: tokenTrackerAbi,
      functionName: "tokenAddresses",
      args: [tokenId],
    })) as `0x${string}`;
    const token = tokenByAddress(address);
    if (token) cache.set(key, token);
    return token;
  } catch {
    return undefined;
  }
}
