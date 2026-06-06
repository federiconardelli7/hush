// Thin glue between the Vercel `@vercel/node` request/response and the faucet core.
// Handles CORS, the method guard, JSON-body extraction, and client IP / host.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { FaucetResult } from "./faucetCore";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function clientIp(req: VercelRequest): string {
  const xff = req.headers["x-forwarded-for"];
  const raw = Array.isArray(xff) ? xff[0] : (xff ?? "");
  return raw.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
}

export function host(req: VercelRequest): string {
  const h = req.headers.host;
  return (Array.isArray(h) ? h[0] : h) ?? "hush";
}

// POST endpoints: apply CORS, guard the method, hand the parsed body + ip + host to a
// core function, and write its { status, body }.
export async function handlePost(
  req: VercelRequest,
  res: VercelResponse,
  run: (body: Record<string, unknown>, ip: string, domain: string) => Promise<FaucetResult>,
): Promise<void> {
  for (const [k, v] of Object.entries(CORS)) res.setHeader(k, v);
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const body =
    req.body && typeof req.body === "object" ? (req.body as Record<string, unknown>) : {};
  const { status, body: out } = await run(body, clientIp(req), host(req));
  res.status(status).json(out);
}
