import { useQuery } from "@tanstack/react-query";
import { commentsRepo } from "@/features/social/commentsRepo";
import { likesRepo } from "@/features/social/likesRepo";

export type FeedSocial = {
  likeCount: number;
  likedByMe: boolean;
  commentCount: number;
};

// Batched like/comment tallies for the loaded feed. Keyed on the tx-hash set (+ me) so
// it refetches when the feed changes. Two `in` queries, aggregated client-side — not
// N+1. RLS only returns rows on visible payments, so the counts never leak hidden
// activity. A like/comment mutation invalidates ["feed-social"] to refresh these.
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

      const likeCount = new Map<string, number>();
      const likedByMe = new Set<string>();
      for (const l of likes) {
        likeCount.set(l.payment_tx_hash, (likeCount.get(l.payment_tx_hash) ?? 0) + 1);
        if (me && l.liker_address === me) likedByMe.add(l.payment_tx_hash);
      }
      const commentCount = new Map<string, number>();
      for (const c of comments) {
        commentCount.set(c.payment_tx_hash, (commentCount.get(c.payment_tx_hash) ?? 0) + 1);
      }

      return Object.fromEntries(
        txHashes.map((tx) => [
          tx,
          {
            likeCount: likeCount.get(tx) ?? 0,
            likedByMe: likedByMe.has(tx),
            commentCount: commentCount.get(tx) ?? 0,
          },
        ]),
      );
    },
  });
}
