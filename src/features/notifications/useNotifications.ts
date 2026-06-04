import { useQuery } from "@tanstack/react-query";
import { paymentsRepo } from "@/features/payments/paymentsRepo";
import { profilesRepo } from "@/features/profile/profilesRepo";
import { requestsRepo } from "@/features/requests/requestsRepo";
import type { Profile } from "@/features/profile/schema";

export type NotificationKind = "received" | "request" | "declined";

export type NotificationItem = {
  id: string;
  kind: NotificationKind;
  created_at: string;
  otherAddress: string;
  other: Profile | null;
  caption?: string | null; // received
  txHash?: string; // received → receipt
  requestId?: string; // request / declined → requests
  declineReason?: string | null; // declined
};

// The current wallet's notifications: money received + incoming (pending) money
// requests, profile-joined and newest-first. ("Your request paid" already surfaces as
// a received payment; declined is in /requests.) Amounts aren't fetched here.
export function useNotifications(me: string | undefined) {
  return useQuery({
    queryKey: ["notifications", me],
    enabled: Boolean(me),
    queryFn: async (): Promise<NotificationItem[]> => {
      const [payments, requests] = await Promise.all([
        paymentsRepo.mine(me!),
        requestsRepo.mine(me!),
      ]);
      const received = payments.filter((p) => p.receiver_address === me);
      const incoming = requests.filter(
        (r) => r.requestee_address === me && r.status === "pending",
      );
      // Your outgoing requests that got declined — alert you, dated by declined_at.
      const declined = requests.filter(
        (r) => r.requester_address === me && r.status === "declined",
      );
      const profiles = await profilesRepo.listByAddresses([
        ...received.map((p) => p.sender_address),
        ...incoming.map((r) => r.requester_address),
        ...declined.map((r) => r.requestee_address),
      ]);

      const items: NotificationItem[] = [
        ...received.map((p) => ({
          id: p.tx_hash,
          kind: "received" as const,
          created_at: p.created_at,
          otherAddress: p.sender_address,
          other: profiles[p.sender_address] ?? null,
          caption: p.caption,
          txHash: p.tx_hash,
        })),
        ...incoming.map((r) => ({
          id: r.id,
          kind: "request" as const,
          created_at: r.created_at,
          otherAddress: r.requester_address,
          other: profiles[r.requester_address] ?? null,
          requestId: r.id,
        })),
        ...declined.map((r) => ({
          id: r.id,
          kind: "declined" as const,
          created_at: r.declined_at ?? r.created_at,
          otherAddress: r.requestee_address,
          other: profiles[r.requestee_address] ?? null,
          requestId: r.id,
          declineReason: r.decline_reason,
        })),
      ];
      return items.sort((a, b) =>
        a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0,
      );
    },
  });
}
