import { useQuery } from "@tanstack/react-query";
import { profilesRepo } from "@/features/profile/profilesRepo";
import { requestsRepo, type MoneyRequest } from "@/features/requests/requestsRepo";
import type { Profile } from "@/features/profile/schema";

export type RequestItem = MoneyRequest & { other: Profile | null };

// The current wallet's requests, split into incoming (someone asked me) and
// outgoing (I asked someone), with the other party's profile joined. Amounts are
// NOT decrypted here — each row decrypts its own ciphertext (see RequestRow).
export function useRequests(me: string | undefined) {
  return useQuery({
    queryKey: ["requests", me],
    enabled: Boolean(me),
    queryFn: async (): Promise<{ incoming: RequestItem[]; outgoing: RequestItem[] }> => {
      const all = await requestsRepo.mine(me!);
      const profiles = await profilesRepo.listByAddresses(
        all.map((r) =>
          r.requester_address === me ? r.requestee_address : r.requester_address,
        ),
      );
      const items: RequestItem[] = all.map((r) => {
        const otherAddr =
          r.requester_address === me ? r.requestee_address : r.requester_address;
        return { ...r, other: profiles[otherAddr] ?? null };
      });
      return {
        incoming: items.filter((r) => r.requestee_address === me),
        outgoing: items.filter((r) => r.requester_address === me),
      };
    },
  });
}
