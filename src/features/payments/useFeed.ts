import { useQuery } from "@tanstack/react-query";
import { paymentsRepo, type Payment } from "@/features/payments/paymentsRepo";
import { profilesRepo } from "@/features/profile/profilesRepo";
import type { Profile } from "@/features/profile/schema";

export type FeedItem = Payment & {
  sender: Profile | null;
  receiver: Profile | null;
};

// The RLS-visible payments, joined with the involved profiles for names.
// Amounts are never fetched (no amount column exists).
export function useFeed() {
  return useQuery({
    queryKey: ["feed"],
    queryFn: async (): Promise<FeedItem[]> => {
      const payments = await paymentsRepo.feed();
      const profiles = await profilesRepo.listByAddresses(
        payments.flatMap((p) => [p.sender_address, p.receiver_address]),
      );
      return payments.map((p) => ({
        ...p,
        sender: profiles[p.sender_address] ?? null,
        receiver: profiles[p.receiver_address] ?? null,
      }));
    },
  });
}
