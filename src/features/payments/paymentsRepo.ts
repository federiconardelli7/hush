import { z } from "zod";
import { supabase } from "@/features/supabase/client";

export const AUDIENCES = ["friends", "public", "private"] as const;
export type Audience = (typeof AUDIENCES)[number];
export const audienceSchema = z.enum(AUDIENCES);

const recordPaymentSchema = z.object({
  tx_hash: z.string().regex(/^0x[0-9a-fA-F]{64}$/, "Invalid tx hash."),
  sender_address: z.string(),
  receiver_address: z.string(),
  audience: audienceSchema,
  caption: z.string().trim().max(280).nullable().optional(),
});
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

// One row per confidential payment. There is NO amount column — the privacy
// invariant. Amounts live only on-chain, encrypted.
export type Payment = {
  tx_hash: string;
  sender_address: string;
  receiver_address: string;
  audience: Audience;
  caption: string | null;
  created_at: string;
};

const COLUMNS =
  "tx_hash, sender_address, receiver_address, audience, caption, created_at";

export const paymentsRepo = {
  async record(input: RecordPaymentInput): Promise<Payment> {
    const p = recordPaymentSchema.parse(input);
    const row = {
      tx_hash: p.tx_hash,
      sender_address: p.sender_address.toLowerCase(),
      receiver_address: p.receiver_address.toLowerCase(),
      audience: p.audience,
      caption: p.caption && p.caption.length > 0 ? p.caption : null,
    };
    const { data, error } = await supabase
      .from("payments")
      .insert(row)
      .select(COLUMNS)
      .single();
    if (error) {
      throw new Error(error.message);
    }
    return data as Payment;
  },

  // RLS decides visibility (own + public + friends-of-mutual-contacts).
  async feed(): Promise<Payment[]> {
    const { data, error } = await supabase
      .from("payments")
      .select(COLUMNS)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      throw new Error(error.message);
    }
    return (data ?? []) as Payment[];
  },

  // The current wallet's own payments (sent or received), newest first. RLS
  // already exposes these rows (current_wallet() in sender/receiver); this is
  // the precise, index-backed query for the Activity screen.
  async mine(address: string): Promise<Payment[]> {
    const a = address.toLowerCase();
    const { data, error } = await supabase
      .from("payments")
      .select(COLUMNS)
      .or(`sender_address.eq.${a},receiver_address.eq.${a}`)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      throw new Error(error.message);
    }
    return (data ?? []) as Payment[];
  },
};
