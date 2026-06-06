import type { VercelRequest, VercelResponse } from "@vercel/node";
import { issueNonce } from "../../server/faucetCore";
import { handlePost } from "../../server/http";

export default function handler(req: VercelRequest, res: VercelResponse) {
  return handlePost(req, res, (body, ip, domain) => issueNonce(body, ip, domain));
}
