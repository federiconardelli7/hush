import { useQuery } from "@tanstack/react-query";
import { profilesRepo } from "@/features/profile/profilesRepo";
import type { Profile } from "@/features/profile/schema";
import { commentsRepo, type Comment } from "@/features/social/commentsRepo";
import { likesRepo } from "@/features/social/likesRepo";

export type ThreadComment = Comment & { author: Profile | null };

export type ThreadData = {
  likeCount: number;
  likedByMe: boolean;
  comments: ThreadComment[];
};

// One payment's social thread: like tally (+ whether I liked) and the comment list,
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
      return {
        likeCount: likes.length,
        likedByMe: Boolean(me) && likes.some((l) => l.liker_address === me),
        comments: comments.map((c) => ({
          ...c,
          author: profiles[c.author_address] ?? null,
        })),
      };
    },
  });
}
