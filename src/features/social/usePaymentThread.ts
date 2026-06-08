import { useQuery } from "@tanstack/react-query";
import { profilesRepo } from "@/features/profile/profilesRepo";
import type { Profile } from "@/features/profile/schema";
import { commentsRepo, type Comment } from "@/features/social/commentsRepo";
import { likesRepo } from "@/features/social/likesRepo";

export type ThreadComment = Comment & { author: Profile | null };

export type ThreadData = {
  reactionCount: number;
  myEmoji: string | null; // my reaction's emoji, or null
  comments: ThreadComment[];
};

// One payment's social thread: reaction tally (+ my emoji) and the comment list,
// profile-joined for names/avatars. RLS gates everything by payment visibility.
export function usePaymentThread(txHash: string, me: string | undefined) {
  return useQuery({
    queryKey: ["thread", txHash, me ?? ""],
    enabled: Boolean(txHash),
    queryFn: async (): Promise<ThreadData> => {
      const [likes, comments] = await Promise.all([
        likesRepo.forPayments([txHash]),
        commentsRepo.listFor(txHash),
      ]);
      const profiles = await profilesRepo.listByAddresses(
        comments.map((c) => c.author_address),
      );
      const mine = me ? likes.find((l) => l.liker_address === me) : undefined;
      return {
        reactionCount: likes.length,
        myEmoji: mine?.emoji ?? null,
        comments: comments.map((c) => ({
          ...c,
          author: profiles[c.author_address] ?? null,
        })),
      };
    },
  });
}
