import { timingSafeEqual } from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { notify } from "../../server/pushCore";

function secretOk(req: VercelRequest): boolean {
  const secret = process.env.PUSH_WEBHOOK_SECRET;
  if (!secret) throw new Error("PUSH_WEBHOOK_SECRET is not set");
  const got = req.headers["x-push-secret"];
  if (typeof got !== "string") return false;
  const a = Buffer.from(got);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false });
    return;
  }
  try {
    if (!secretOk(req)) {
      res.status(401).json({ ok: false });
      return;
    }
    const result = await notify(req.body);
    res.status(200).json({ ok: true, ...result });
  } catch (error) {
    // 200 so pg_net never retry-storms; details stay in Vercel logs only.
    console.error("push notify failed:", error);
    res.status(200).json({ ok: false });
  }
}
