import { useQuery } from "@tanstack/react-query";
import { paymentsRepo } from "@/features/payments/paymentsRepo";
import { profilesRepo } from "@/features/profile/profilesRepo";
import { requestsRepo } from "@/features/requests/requestsRepo";
import type { Profile } from "@/features/profile/schema";

export type NotificationKind = "received" | "request" | "outgoing" | "declined";

// Only these kinds count as "new for me" (drive the unread highlight + bell badge);
// "outgoing" is my own pending ask — informational, shown for the Notify-again action.
export const isUnreadKind = (kind: NotificationKind) => kind !== "outgoing";

export type NotificationItem = {
  id: string; // stable key; for a nudged request it changes so the row re-surfaces as unread
  kind: NotificationKind;
  created_at: string; // effective sort time (max(created, reminded) for incoming requests)
  otherAddress: string;
  other: Profile | null;
  // received
  caption?: string | null;
  txHash?: string;
  // request / outgoing / declined
  requestId?: string;
  note?: string | null;
  amountPct?: string[]; // ciphertext readable by me (incoming → requestee, outgoing → requester)
  requesterAddress?: string; // incoming request → who to Pay
  lastRemindedAt?: string | null; // outgoing → Notify-again cooldown
  declineReason?: string | null; // declined
};

const laterOf = (a: string, b: string | null | undefined) => (b && b > a ? b : a);

// The current wallet's notifications, profile-joined and newest-first: money received
// (→ receipt), incoming pending requests (amount + Pay), my outgoing pending requests
// (Notify again), and my requests that were declined. No new table — aggregated from
// payments + requests. Amounts aren't fetched here (each row decrypts its own).
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
      const outgoing = requests.filter(
        (r) => r.requester_address === me && r.status === "pending",
      );
      const declined = requests.filter(
        (r) => r.requester_address === me && r.status === "declined",
      );

      const profiles = await profilesRepo.listByAddresses([
        ...received.map((p) => p.sender_address),
        ...incoming.map((r) => r.requester_address),
        ...outgoing.map((r) => r.requestee_address),
        ...declined.map((r) => r.requestee_address),
      ]);

      const items: NotificationItem[] = [
        ...received.map((p) => ({
          id: `received:${p.tx_hash}`,
          kind: "received" as const,
          created_at: p.created_at,
          otherAddress: p.sender_address,
          other: profiles[p.sender_address] ?? null,
          caption: p.caption,
          txHash: p.tx_hash,
        })),
        ...incoming.map((r) => {
          const at = laterOf(r.created_at, r.last_reminded_at);
          return {
            id: `request:${r.id}:${at}`, // bumps when nudged → re-surfaces as unread
            kind: "request" as const,
            created_at: at,
            otherAddress: r.requester_address,
            other: profiles[r.requester_address] ?? null,
            requestId: r.id,
            note: r.note,
            amountPct: r.amount_enc_requestee,
            requesterAddress: r.requester_address,
          };
        }),
        ...outgoing.map((r) => ({
          id: `outgoing:${r.id}`,
          kind: "outgoing" as const,
          created_at: r.created_at,
          otherAddress: r.requestee_address,
          other: profiles[r.requestee_address] ?? null,
          requestId: r.id,
          note: r.note,
          amountPct: r.amount_enc_requester,
          lastRemindedAt: r.last_reminded_at ?? null,
        })),
        ...declined.map((r) => ({
          id: `declined:${r.id}:${r.declined_at ?? r.created_at}`,
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
