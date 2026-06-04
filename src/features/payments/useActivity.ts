import { useQuery } from "@tanstack/react-query";
import { paymentsRepo } from "@/features/payments/paymentsRepo";
import type { FeedItem } from "@/features/payments/useFeed";
import { profilesRepo } from "@/features/profile/profilesRepo";

export type PaymentDirection = "sent" | "received";
export type ActivityItem = FeedItem & { direction: PaymentDirection };

// The current wallet's own payment history (sent + received), with profiles
// joined for names. Amounts are NOT fetched here — each row decrypts its own
// amount on-chain (see ActivityRow). Mirrors useFeed.
export function useActivity(me: string | undefined) {
  return useQuery({
    queryKey: ["activity", me],
    enabled: Boolean(me),
    queryFn: async (): Promise<ActivityItem[]> => {
      const payments = await paymentsRepo.mine(me!);
      const profiles = await profilesRepo.listByAddresses(
        payments.flatMap((p) => [p.sender_address, p.receiver_address]),
      );
      return payments.map((p) => ({
        ...p,
        sender: profiles[p.sender_address] ?? null,
        receiver: profiles[p.receiver_address] ?? null,
        direction: p.sender_address === me ? "sent" : "received",
      }));
    },
  });
}
