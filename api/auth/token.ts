import type { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyAndMint } from "../../server/faucetCore";
import { handlePost } from "../../server/http";

export default function handler(req: VercelRequest, res: VercelResponse) {
  return handlePost(req, res, (body) => verifyAndMint(body));
}
