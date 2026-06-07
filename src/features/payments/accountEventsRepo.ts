import { z } from "zod";
import { supabase } from "@/features/supabase/client";

export const ACCOUNT_EVENT_KINDS = ["deposit", "withdraw"] as const;
export type AccountEventKind = (typeof ACCOUNT_EVENT_KINDS)[number];

const recordSchema = z.object({
  tx_hash: z.string().regex(/^0x[0-9a-fA-F]{64}$/, "Invalid tx hash."),
  address: z.string(),
  kind: z.enum(ACCOUNT_EVENT_KINDS),
});
export type RecordAccountEventInput = z.infer<typeof recordSchema>;

// One row per deposit/withdraw. NO amount column — deposit/withdraw amounts are
// public on-chain but still re-derived client-side, never stored.
export type AccountEvent = {
  tx_hash: string;
  address: string;
  kind: AccountEventKind;
  created_at: string;
};

const COLUMNS = "tx_hash, address, kind, created_at";

export const accountEventsRepo = {
  async record(input: RecordAccountEventInput): Promise<AccountEvent> {
    const e = recordSchema.parse(input);
    const { data, error } = await supabase
      .from("account_events")
      .insert({ tx_hash: e.tx_hash, address: e.address.toLowerCase(), kind: e.kind })
      .select(COLUMNS)
      .single();
    if (error) {
      throw new Error(error.message);
    }
    return data as AccountEvent;
  },

  // Backfill rows discovered on-chain (reconcileAccountEvents) that never reached the
  // DB — e.g. the post-tx write failed with an expired JWT. `created_at` is the block
  // time so rows sort correctly; tx_hash is the PK so existing rows are left untouched
  // (ignoreDuplicates). RLS still scopes inserts to the caller's own wallet.
  async backfill(
    rows: { tx_hash: string; address: string; kind: AccountEventKind; created_at: string }[],
  ): Promise<void> {
    if (rows.length === 0) return;
    const { error } = await supabase.from("account_events").upsert(
      rows.map((r) => ({
        tx_hash: r.tx_hash,
        address: r.address.toLowerCase(),
        kind: r.kind,
        created_at: r.created_at,
      })),
      { onConflict: "tx_hash", ignoreDuplicates: true },
    );
    if (error) {
      throw new Error(error.message);
    }
  },

  // The current wallet's deposit/withdraw events, newest first (RLS: owner-only).
  async mine(address: string): Promise<AccountEvent[]> {
    const { data, error } = await supabase
      .from("account_events")
      .select(COLUMNS)
      .eq("address", address.toLowerCase())
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      throw new Error(error.message);
    }
    return (data ?? []) as AccountEvent[];
  },
};
