import { supabase } from "@/features/supabase/client";
import { DEFAULT_REACTION, REACTION_EMOJIS } from "@/features/social/reactions";

// A reaction on a payment (one per person — PK (payment_tx_hash, liker_address)). `emoji`
// is which reaction; ❤️ by default. No amount, ever — same privacy invariant as payments.
// RLS: readable only where the payment is visible; writable only as yourself.
export type Like = {
  payment_tx_hash: string;
  liker_address: string;
  emoji: string;
  created_at: string;
};

const COLUMNS = "payment_tx_hash, liker_address, emoji, created_at";

export const likesRepo = {
  // All reactions for a set of payments (one batched `in` query, not N+1). RLS only
  // returns rows on payments the caller can see, so counts never leak hidden activity.
  async forPayments(txHashes: string[]): Promise<Like[]> {
    if (txHashes.length === 0) return [];
    const { data, error } = await supabase
      .from("likes")
      .select(COLUMNS)
      .in("payment_tx_hash", txHashes);
    if (error) {
      throw new Error(error.message);
    }
    return (data ?? []) as Like[];
  },

  // Set my reaction (idempotent on the PK — re-reacting updates the emoji in place).
  async add(txHash: string, liker: string, emoji: string = DEFAULT_REACTION): Promise<void> {
    // Only a curated emoji is stored (the DB CHECK bounds length; this bounds the set).
    const safe = (REACTION_EMOJIS as readonly string[]).includes(emoji)
      ? emoji
      : DEFAULT_REACTION;
    const { error } = await supabase
      .from("likes")
      .upsert(
        { payment_tx_hash: txHash, liker_address: liker.toLowerCase(), emoji: safe },
        { onConflict: "payment_tx_hash,liker_address" },
      );
    if (error) {
      throw new Error(error.message);
    }
  },

  async remove(txHash: string, liker: string): Promise<void> {
    const { error } = await supabase
      .from("likes")
      .delete()
      .eq("payment_tx_hash", txHash)
      .eq("liker_address", liker.toLowerCase());
    if (error) {
      throw new Error(error.message);
    }
  },
};
