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
  | "commented"
  | "mentioned";

// Only these kinds count as "new for me" (drive the unread highlight + bell badge);
// "outgoing" is my own pending ask — informational. liked/commented appear only when opted
// in (socialPrefs); mentions are on by default. When present, all count as unread.
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
  // liked / commented / mentioned → tap opens the payment thread
  paymentSenderName?: string;
  paymentSenderAddress?: string;
  paymentReceiverName?: string;
  paymentReceiverAddress?: string;
  commentBody?: string;
};

const laterOf = (a: string, b: string | null | undefined) => (b && b > a ? b : a);

// The current wallet's notifications, profile-joined and newest-first: money received
// (→ receipt), incoming/outgoing/declined requests, and — per socialPrefs — likes/comments
// on my own payments and @mentions of me (→ thread). No new table; aggregated from
// payments + requests + likes/comments. Amounts aren't fetched here.
export function useNotifications(me: string | undefined) {
  const prefs = useSocialPrefs(me);
  return useQuery({
    queryKey: ["notifications", me, prefs.likes, prefs.comments, prefs.mentions],
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

      // Social: reactions/comments on MY payments + @mentions of me, each gated by its
      // pref. Mentions can land on payments that aren't mine, so their headers are fetched
      // separately. All excludes my own actions.
      const myTxHashes = payments.map((p) => p.tx_hash);
      const [likes, comments, mentionComments] = await Promise.all([
        prefs.likes && myTxHashes.length
          ? likesRepo.forPayments(myTxHashes)
          : Promise.resolve([]),
        prefs.comments && myTxHashes.length
          ? commentsRepo.listForPayments(myTxHashes)
          : Promise.resolve([]),
        prefs.mentions ? commentsRepo.mentioning(me!) : Promise.resolve([]),
      ]);

      const paymentByTx = new Map(payments.map((p) => [p.tx_hash, p]));
      const likedMine = likes.filter(
        (l) => l.liker_address !== me && paymentByTx.has(l.payment_tx_hash),
      );
      const commentedMine = comments.filter(
        (c) => c.author_address !== me && paymentByTx.has(c.payment_tx_hash),
      );
      const mentionsMine = mentionComments.filter((c) => c.author_address !== me);

      // Fetch the payment header for any mention on a payment that isn't mine (RLS-gated).
      const extraTx = [
        ...new Set(
          mentionsMine
            .map((c) => c.payment_tx_hash)
            .filter((tx) => !paymentByTx.has(tx)),
        ),
      ];
      if (extraTx.length) {
        for (const pay of await paymentsRepo.byTxHashes(extraTx)) {
          paymentByTx.set(pay.tx_hash, pay);
        }
      }
      const mentionsResolved = mentionsMine.filter((c) =>
        paymentByTx.has(c.payment_tx_hash),
      );

      const profiles = await profilesRepo.listByAddresses([
        ...received.map((p) => p.sender_address),
        ...incoming.map((r) => r.requester_address),
        ...outgoing.map((r) => r.requestee_address),
        ...declined.map((r) => r.requestee_address),
        ...likedMine.map((l) => l.liker_address),
        ...commentedMine.map((c) => c.author_address),
        ...mentionsResolved.map((c) => c.author_address),
        ...[...paymentByTx.values()].flatMap((p) => [
          p.sender_address,
          p.receiver_address,
        ]),
      ]);

      const paymentParties = (txHash: string) => {
        const pay = paymentByTx.get(txHash)!;
        return {
          caption: pay.caption,
          paymentSenderName: displayName(
            profiles[pay.sender_address] ?? null,
            pay.sender_address,
          ),
          paymentSenderAddress: pay.sender_address,
          paymentReceiverName: displayName(
            profiles[pay.receiver_address] ?? null,
            pay.receiver_address,
          ),
          paymentReceiverAddress: pay.receiver_address,
        };
      };

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
        ...likedMine.map((l) => ({
          id: `liked:${l.payment_tx_hash}:${l.liker_address}`,
          kind: "liked" as const,
          created_at: l.created_at,
          otherAddress: l.liker_address,
          other: profiles[l.liker_address] ?? null,
          txHash: l.payment_tx_hash,
          ...paymentParties(l.payment_tx_hash),
        })),
        ...commentedMine.map((c) => ({
          id: `commented:${c.id}`,
          kind: "commented" as const,
          created_at: c.created_at,
          otherAddress: c.author_address,
          other: profiles[c.author_address] ?? null,
          txHash: c.payment_tx_hash,
          commentBody: c.body,
          ...paymentParties(c.payment_tx_hash),
        })),
        ...mentionsResolved.map((c) => ({
          id: `mentioned:${c.id}`,
          kind: "mentioned" as const,
          created_at: c.created_at,
          otherAddress: c.author_address,
          other: profiles[c.author_address] ?? null,
          txHash: c.payment_tx_hash,
          commentBody: c.body,
          ...paymentParties(c.payment_tx_hash),
        })),
      ];
      return items.sort((a, b) =>
        a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0,
      );
    },
  });
}
