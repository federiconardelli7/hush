import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Expo, type ExpoPushMessage } from "expo-server-sdk";
import { z } from "zod";

// Webhook payload from Supabase database webhooks (pg_net).
const webhookSchema = z.object({
  type: z.enum(["INSERT", "UPDATE"]),
  table: z.string(),
  record: z.record(z.string(), z.unknown()),
  old_record: z.record(z.string(), z.unknown()).nullable().optional(),
});

type Recipient = {
  address: string;
  body: string;
  gate: "always" | "likes" | "comments" | "mentions";
};

const str = (r: Record<string, unknown>, k: string): string =>
  typeof r[k] === "string" ? (r[k] as string) : "";

function admin(): SupabaseClient {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase admin env (URL / SERVICE_ROLE_KEY) is not set");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function actorName(db: SupabaseClient, address: string): Promise<string> {
  const { data } = await db
    .from("profiles")
    .select("display_name, username")
    .eq("address", address.toLowerCase())
    .maybeSingle();
  return (
    data?.display_name ||
    (data?.username ? `@${data.username}` : `${address.slice(0, 6)}…${address.slice(-4)}`)
  );
}

async function paymentParties(db: SupabaseClient, txHash: string): Promise<string[]> {
  const { data } = await db
    .from("payments")
    .select("sender_address, receiver_address")
    .eq("tx_hash", txHash)
    .maybeSingle();
  return data ? [data.sender_address, data.receiver_address] : [];
}

// Maps one webhook event to recipients + banner bodies (mirrors useNotifications.ts;
// the actor never notifies themselves). Bodies contain ONLY a display name + a fixed
// verb — never amounts (they don't exist in the DB), captions, or comment text.
async function resolve(
  db: SupabaseClient,
  evt: z.infer<typeof webhookSchema>,
): Promise<Recipient[]> {
  const r = evt.record;
  if (evt.table === "payments" && evt.type === "INSERT") {
    const name = await actorName(db, str(r, "sender_address"));
    return [{ address: str(r, "receiver_address"), body: `${name} paid you`, gate: "always" }];
  }
  if (evt.table === "requests" && evt.type === "INSERT") {
    const name = await actorName(db, str(r, "requester_address"));
    return [{ address: str(r, "requestee_address"), body: `${name} requested money`, gate: "always" }];
  }
  if (evt.table === "requests" && evt.type === "UPDATE") {
    const old = evt.old_record ?? {};
    if (str(r, "status") === "declined" && str(old, "status") === "pending") {
      const name = await actorName(db, str(r, "requestee_address"));
      return [
        { address: str(r, "requester_address"), body: `${name} declined your request`, gate: "always" },
      ];
    }
    if (
      str(r, "status") === "pending" &&
      str(r, "last_reminded_at") !== str(old, "last_reminded_at")
    ) {
      const name = await actorName(db, str(r, "requester_address"));
      return [
        { address: str(r, "requestee_address"), body: `${name} sent a reminder`, gate: "always" },
      ];
    }
    return [];
  }
  if (evt.table === "comments" && evt.type === "INSERT") {
    const author = str(r, "author_address");
    const name = await actorName(db, author);
    const parties = await paymentParties(db, str(r, "payment_tx_hash"));
    const out: Recipient[] = parties
      .filter((a) => a !== author)
      .map((a) => ({ address: a, body: `${name} commented on your payment`, gate: "comments" as const }));
    const mentioned = Array.isArray(r.mentions) ? (r.mentions as string[]) : [];
    for (const m of mentioned) {
      if (m !== author && !out.some((o) => o.address === m)) {
        out.push({ address: m, body: `${name} mentioned you`, gate: "mentions" });
      }
    }
    return out;
  }
  if (evt.table === "likes" && evt.type === "INSERT") {
    const liker = str(r, "liker_address");
    const name = await actorName(db, liker);
    const parties = await paymentParties(db, str(r, "payment_tx_hash"));
    return parties
      .filter((a) => a !== liker)
      .map((a) => ({ address: a, body: `${name} reacted to your payment`, gate: "likes" as const }));
  }
  return [];
}

// Prefs gate: missing row = defaults (likes/comments OFF, mentions ON) — matches the client.
async function allowed(db: SupabaseClient, rec: Recipient): Promise<boolean> {
  if (rec.gate === "always") return true;
  const { data } = await db
    .from("notification_prefs")
    .select("likes, comments, mentions")
    .eq("address", rec.address)
    .maybeSingle();
  const prefs = data ?? { likes: false, comments: false, mentions: true };
  return prefs[rec.gate] === true;
}

export async function notify(rawBody: unknown): Promise<{ sent: number }> {
  const evt = webhookSchema.parse(rawBody);
  const db = admin();
  const recipients: Recipient[] = [];
  for (const rec of await resolve(db, evt)) {
    if (await allowed(db, rec)) recipients.push(rec);
  }
  if (recipients.length === 0) return { sent: 0 };

  const { data: tokens } = await db
    .from("push_tokens")
    .select("token, address")
    .in(
      "address",
      recipients.map((rec) => rec.address),
    );
  if (!tokens || tokens.length === 0) return { sent: 0 };

  const bodyByAddress = new Map(recipients.map((rec) => [rec.address, rec.body]));
  const expo = new Expo();
  const messages: ExpoPushMessage[] = tokens
    .filter((t) => Expo.isExpoPushToken(t.token))
    .map((t) => ({
      to: t.token,
      title: "Hush",
      body: bodyByAddress.get(t.address) ?? "New activity",
      data: { url: "/notifications" },
    }));

  let sent = 0;
  const dead: string[] = [];
  for (const chunk of expo.chunkPushNotifications(messages)) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      tickets.forEach((ticket, i) => {
        if (ticket.status === "ok") sent += 1;
        else if (ticket.details?.error === "DeviceNotRegistered") {
          dead.push(String(chunk[i].to));
        }
      });
    } catch (error) {
      console.error("push send failed:", error);
    }
  }
  if (dead.length) await db.from("push_tokens").delete().in("token", dead);
  return { sent };
}
