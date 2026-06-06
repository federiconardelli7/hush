import { useQuery } from "@tanstack/react-query";
import { erc20Abi, formatUnits } from "viem";
import { usePublicClient } from "wagmi";
import { tokenByAddress } from "@/features/eerc/tokens/registry";
import { useEerc } from "@/features/eerc/useEerc";

// The user's NON-encrypted (public ERC20) balance of `tokenAddress` in their Hush
// wallet — i.e. how much they have available to deposit. (The ENCRYPTED balance is
// eerc.balanceFor.) Read on-chain via balanceOf, refetched periodically so a fresh
// faucet claim / incoming transfer shows up.
export function useWalletTokenBalance(tokenAddress: string) {
  const { address } = useEerc();
  const publicClient = usePublicClient();
  const token = tokenByAddress(tokenAddress);
  const q = useQuery({
    queryKey: ["wallet-balance", token?.address, address],
    enabled: Boolean(publicClient && address && token),
    refetchInterval: 15000,
    queryFn: async () =>
      (await publicClient!.readContract({
        address: token!.address,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address!],
      })) as bigint,
  });
  const raw = q.data ?? 0n;
  const parsed = token ? formatUnits(raw, token.decimals) : "";
  return { parsed, raw, isLoading: q.isLoading, refetch: q.refetch };
}
