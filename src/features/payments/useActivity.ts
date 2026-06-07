import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { accountEventsRepo } from "@/features/payments/accountEventsRepo";
import { paymentsRepo } from "@/features/payments/paymentsRepo";
import { reconcileAccountEvents } from "@/features/payments/reconcileAccountEvents";
import { profilesRepo } from "@/features/profile/profilesRepo";
import type { Profile } from "@/features/profile/schema";

export type ActivityKind = "sent" | "received" | "deposit" | "withdraw";

// A unified row in the user's money history. Transfers carry a counterparty +
// caption; deposit/withdraw carry neither. Amounts are NOT fetched here — each
// row decrypts its own on-chain (see ActivityRow).
export type ActivityEntry = {
  tx_hash: string;
  created_at: string;
  kind: ActivityKind;
  counterparty: Profile | null;
  counterpartyAddress: string | null;
  caption: string | null;
};

export function useActivity(me: string | undefined) {
  const publicClient = usePublicClient();
  return useQuery({
    queryKey: ["activity", me],
    enabled: Boolean(me),
    queryFn: async (): Promise<ActivityEntry[]> => {
      // Heal any deposit/withdraw the chain has but the DB is missing (e.g. a post-tx
      // write that failed) before reading. Best-effort — never block Activity on it.
      if (publicClient) {
        try {
          await reconcileAccountEvents(publicClient, me!);
        } catch {
          // reconcile is best-effort; fall through to whatever the DB already has
        }
      }
      const [payments, events] = await Promise.all([
        paymentsRepo.mine(me!),
        accountEventsRepo.mine(me!),
      ]);
      const profiles = await profilesRepo.listByAddresses(
        payments.flatMap((p) => [p.sender_address, p.receiver_address]),
      );

      const transfers: ActivityEntry[] = payments.map((p) => {
        const sent = p.sender_address === me;
        const counterpartyAddress = sent ? p.receiver_address : p.sender_address;
        return {
          tx_hash: p.tx_hash,
          created_at: p.created_at,
          kind: sent ? "sent" : "received",
          counterparty: profiles[counterpartyAddress] ?? null,
          counterpartyAddress,
          caption: p.caption,
        };
      });

      const cash: ActivityEntry[] = events.map((e) => ({
        tx_hash: e.tx_hash,
        created_at: e.created_at,
        kind: e.kind,
        counterparty: null,
        counterpartyAddress: null,
        caption: null,
      }));

      return [...transfers, ...cash].sort((a, b) =>
        a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0,
      );
    },
  });
}
