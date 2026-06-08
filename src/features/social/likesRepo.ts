import { supabase } from "@/features/supabase/client";

// A like on a payment. No amount, ever — same privacy invariant as payments.
// RLS: readable only where the payment is visible (can_see_payment); writable
// only as yourself (liker_address = current_wallet()).
export type Like = {
  payment_tx_hash: string;
  liker_address: string;
  created_at: string;
};

const COLUMNS = "payment_tx_hash, liker_address, created_at";

export const likesRepo = {
  // All likes for a set of payments (one batched `in` query, not N+1). RLS only
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

  // Idempotent: the composite PK (payment_tx_hash, liker_address) prevents double-likes.
  async add(txHash: string, liker: string): Promise<void> {
    const { error } = await supabase
      .from("likes")
      .upsert(
        { payment_tx_hash: txHash, liker_address: liker.toLowerCase() },
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
