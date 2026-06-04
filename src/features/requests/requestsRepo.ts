import { z } from "zod";
import { supabase } from "@/features/supabase/client";

export const REQUEST_STATUSES = ["pending", "fulfilled", "declined", "canceled"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

const createSchema = z.object({
  requester_address: z.string(),
  requestee_address: z.string(),
  amount_enc_requestee: z.array(z.string()).length(7),
  amount_enc_requester: z.array(z.string()).length(7),
  note: z.string().trim().max(200).nullable().optional(),
});
export type CreateRequestInput = z.infer<typeof createSchema>;

// One money request. The amount lives ONLY as a Poseidon ciphertext encrypted to
// each party's eERC pubkey — no plaintext amount is ever stored.
export type MoneyRequest = {
  id: string;
  requester_address: string;
  requestee_address: string;
  amount_enc_requestee: string[];
  amount_enc_requester: string[];
  status: RequestStatus;
  tx_hash: string | null;
  decline_reason: string | null;
  declined_at: string | null;
  note: string | null;
  created_at: string;
};

const COLUMNS =
  "id, requester_address, requestee_address, amount_enc_requestee, amount_enc_requester, status, tx_hash, decline_reason, declined_at, note, created_at";

export const requestsRepo = {
  async create(input: CreateRequestInput): Promise<MoneyRequest> {
    const r = createSchema.parse(input);
    const { data, error } = await supabase
      .from("requests")
      .insert({
        requester_address: r.requester_address.toLowerCase(),
        requestee_address: r.requestee_address.toLowerCase(),
        amount_enc_requestee: r.amount_enc_requestee,
        amount_enc_requester: r.amount_enc_requester,
        note: r.note && r.note.length > 0 ? r.note : null,
      })
      .select(COLUMNS)
      .single();
    if (error) {
      throw new Error(error.message);
    }
    return data as MoneyRequest;
  },

  // All requests involving the current wallet, newest first (RLS scopes to the two parties).
  async mine(address: string): Promise<MoneyRequest[]> {
    const a = address.toLowerCase();
    const { data, error } = await supabase
      .from("requests")
      .select(COLUMNS)
      .or(`requester_address.eq.${a},requestee_address.eq.${a}`)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      throw new Error(error.message);
    }
    return (data ?? []) as MoneyRequest[];
  },

  async setStatus(
    id: string,
    status: RequestStatus,
    txHash?: string,
    declineReason?: string,
  ): Promise<void> {
    const patch: {
      status: RequestStatus;
      tx_hash?: string;
      decline_reason?: string;
      declined_at?: string;
    } = { status };
    if (txHash) {
      patch.tx_hash = txHash;
    }
    if (declineReason) {
      patch.decline_reason = declineReason;
    }
    if (status === "declined") {
      patch.declined_at = new Date().toISOString();
    }
    const { error } = await supabase.from("requests").update(patch).eq("id", id);
    if (error) {
      throw new Error(error.message);
    }
  },
};
