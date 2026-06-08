import { z } from "zod";
import { supabase } from "@/features/supabase/client";

// A comment on a payment. No amount — same privacy invariant. RLS: readable only
// where the payment is visible; insert only as yourself; delete only your own.
export type Comment = {
  id: string;
  payment_tx_hash: string;
  author_address: string;
  body: string;
  created_at: string;
};

const COLUMNS = "id, payment_tx_hash, author_address, body, created_at";

// Mirrors the DB CHECK (char_length 1..500).
const bodySchema = z.string().trim().min(1, "Say something first.").max(500);

export const commentsRepo = {
  // One payment's comments, oldest-first (reads like a thread). Index-backed by
  // comments_payment_idx (payment_tx_hash, created_at).
  async listFor(txHash: string): Promise<Comment[]> {
    const { data, error } = await supabase
      .from("comments")
      .select(COLUMNS)
      .eq("payment_tx_hash", txHash)
      .order("created_at", { ascending: true });
    if (error) {
      throw new Error(error.message);
    }
    return (data ?? []) as Comment[];
  },

  // Just the payment_tx_hash for a set of payments (batched) — for feed comment counts.
  async forPayments(txHashes: string[]): Promise<{ payment_tx_hash: string }[]> {
    if (txHashes.length === 0) return [];
    const { data, error } = await supabase
      .from("comments")
      .select("payment_tx_hash")
      .in("payment_tx_hash", txHashes);
    if (error) {
      throw new Error(error.message);
    }
    return (data ?? []) as { payment_tx_hash: string }[];
  },

  // Full comments for a set of payments (newest-first) — for notification derivation
  // (likes/comments on the current wallet's own payments).
  async listForPayments(txHashes: string[]): Promise<Comment[]> {
    if (txHashes.length === 0) return [];
    const { data, error } = await supabase
      .from("comments")
      .select(COLUMNS)
      .in("payment_tx_hash", txHashes)
      .order("created_at", { ascending: false });
    if (error) {
      throw new Error(error.message);
    }
    return (data ?? []) as Comment[];
  },

  async add(txHash: string, author: string, body: string): Promise<Comment> {
    const clean = bodySchema.parse(body);
    const { data, error } = await supabase
      .from("comments")
      .insert({
        payment_tx_hash: txHash,
        author_address: author.toLowerCase(),
        body: clean,
      })
      .select(COLUMNS)
      .single();
    if (error) {
      throw new Error(error.message);
    }
    return data as Comment;
  },

  // RLS limits this to the author (comments_delete policy).
  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("comments").delete().eq("id", id);
    if (error) {
      throw new Error(error.message);
    }
  },
};
