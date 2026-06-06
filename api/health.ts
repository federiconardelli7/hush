import type { VercelRequest, VercelResponse } from "@vercel/node";
import { health } from "../server/faucetCore";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const { status, body } = await health();
  res.status(status).json(body);
}
