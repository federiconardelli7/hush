import { useQuery } from "@tanstack/react-query";
import { useSocialPrefs } from "@/features/notifications/socialPrefs";
import { paymentsRepo } from "@/features/payments/paymentsRepo";
import { profilesRepo } from "@/features/profile/profilesRepo";
import { requestsRepo } from "@/features/requests/requestsRepo";
import type { Profile } from "@/features/profile/schema";
import { commentsRepo } from "@/features/social/commentsRepo";
import { likesRepo } from "@/features/social/likesRepo";
import { displayName } from "@/lib/identity";

export type NotificationKind =
  | "received"
  | "request"
  | "outgoing"
  | "declined"
  | "liked"
  | "commented";

// Only these kinds count as "new for me" (drive the unread highlight + bell badge);
// "outgoing" is my own pending ask — informational, shown for the Notify-again action.
// liked/commented only appear when opted in (socialPrefs); when present they're unread.
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
  // liked / commented (on one of my payments) → tap opens the payment thread
  paymentSenderName?: string;
  paymentSenderAddress?: string;
  paymentReceiverName?: string;
  paymentReceiverAddress?: string;
  commentBody?: string;
};

const laterOf = (a: string, b: string | null | undefined) => (b && b > a ? b : a);

// The current wallet's notifications, profile-joined and newest-first: money received
// (→ receipt), incoming/outgoing/declined requests, and — when opted in via socialPrefs —
// likes/comments on my own payments (→ thread). No new table; aggregated from payments +
// requests + likes/comments. Amounts aren't fetched here (each row decrypts its own).
export function useNotifications(me: string | undefined) {
  const prefs = useSocialPrefs(me);
  return useQuery({
    queryKey: ["notifications", me, prefs.likes, prefs.comments],
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

      // Social: likes/comments on MY payments (sent or received), excluding my own
      // reactions, only when the matching pref is on (off by default).
      const myTxHashes = payments.map((p) => p.tx_hash);
      const [likes, comments] = await Promise.all([
        prefs.likes && myTxHashes.length
          ? likesRepo.forPayments(myTxHashes)
          : Promise.resolve([]),
        prefs.comments && myTxHashes.length
          ? commentsRepo.listForPayments(myTxHashes)
          : Promise.resolve([]),
      ]);
      const paymentByTx = new Map(payments.map((p) => [p.tx_hash, p]));
      // Exclude my own reactions; require the payment be one of mine (guards the
      // `paymentByTx.get(...)!` below against any future RLS divergence between
      // can_see_payment and payments_select).
      const likedMine = likes.filter(
        (l) => l.liker_address !== me && paymentByTx.has(l.payment_tx_hash),
      );
      const commentedMine = comments.filter(
        (c) => c.author_address !== me && paymentByTx.has(c.payment_tx_hash),
      );

      const profiles = await profilesRepo.listByAddresses([
        ...received.map((p) => p.sender_address),
        ...incoming.map((r) => r.requester_address),
        ...outgoing.map((r) => r.requestee_address),
        ...declined.map((r) => r.requestee_address),
        ...likedMine.map((l) => l.liker_address),
        ...commentedMine.map((c) => c.author_address),
        ...payments.flatMap((p) => [p.sender_address, p.receiver_address]),
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
        ...likedMine.map((l) => {
          const pay = paymentByTx.get(l.payment_tx_hash)!;
          return {
            id: `liked:${l.payment_tx_hash}:${l.liker_address}`,
            kind: "liked" as const,
            created_at: l.created_at,
            otherAddress: l.liker_address,
            other: profiles[l.liker_address] ?? null,
            txHash: l.payment_tx_hash,
            caption: pay.caption,
            paymentSenderName: displayName(profiles[pay.sender_address] ?? null, pay.sender_address),
            paymentSenderAddress: pay.sender_address,
            paymentReceiverName: displayName(profiles[pay.receiver_address] ?? null, pay.receiver_address),
            paymentReceiverAddress: pay.receiver_address,
          };
        }),
        ...commentedMine.map((c) => {
          const pay = paymentByTx.get(c.payment_tx_hash)!;
          return {
            id: `commented:${c.id}`,
            kind: "commented" as const,
            created_at: c.created_at,
            otherAddress: c.author_address,
            other: profiles[c.author_address] ?? null,
            txHash: c.payment_tx_hash,
            caption: pay.caption,
            commentBody: c.body,
            paymentSenderName: displayName(profiles[pay.sender_address] ?? null, pay.sender_address),
            paymentSenderAddress: pay.sender_address,
            paymentReceiverName: displayName(profiles[pay.receiver_address] ?? null, pay.receiver_address),
            paymentReceiverAddress: pay.receiver_address,
          };
        }),
      ];
      return items.sort((a, b) =>
        a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0,
      );
    },
  });
}
