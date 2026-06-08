import { useQuery } from "@tanstack/react-query";
import { commentsRepo } from "@/features/social/commentsRepo";
import { likesRepo } from "@/features/social/likesRepo";

export type FeedSocial = {
  reactionCount: number;
  myEmoji: string | null; // my reaction's emoji, or null if I haven't reacted
  commentCount: number;
};

// Batched reaction/comment tallies for the loaded feed. Keyed on the tx-hash set (+ me) so
// it refetches when the feed changes. Two `in` queries, aggregated client-side — not N+1.
// RLS only returns rows on visible payments, so the counts never leak hidden activity. A
// reaction/comment mutation invalidates ["feed-social"] to refresh these.
export function useFeedSocial(txHashes: string[], me: string | undefined) {
  const key = [...txHashes].sort().join(",");
  return useQuery({
    queryKey: ["feed-social", key, me ?? ""],
    enabled: txHashes.length > 0,
    queryFn: async (): Promise<Record<string, FeedSocial>> => {
      const [likes, comments] = await Promise.all([
        likesRepo.forPayments(txHashes),
        commentsRepo.forPayments(txHashes),
      ]);

      const reactionCount = new Map<string, number>();
      const myEmoji = new Map<string, string>();
      for (const l of likes) {
        reactionCount.set(l.payment_tx_hash, (reactionCount.get(l.payment_tx_hash) ?? 0) + 1);
        if (me && l.liker_address === me) myEmoji.set(l.payment_tx_hash, l.emoji);
      }
      const commentCount = new Map<string, number>();
      for (const c of comments) {
        commentCount.set(c.payment_tx_hash, (commentCount.get(c.payment_tx_hash) ?? 0) + 1);
      }

      return Object.fromEntries(
        txHashes.map((tx) => [
          tx,
          {
            reactionCount: reactionCount.get(tx) ?? 0,
            myEmoji: myEmoji.get(tx) ?? null,
            commentCount: commentCount.get(tx) ?? 0,
          },
        ]),
      );
    },
  });
}
