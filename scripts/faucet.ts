// Local dev server for the Hush faucet/auth backend. In production these run as
// Vercel `/api` functions (hush/api/*); locally this thin node:http wrapper calls the
// same faucetCore so behaviour matches (state lives in Supabase either way). Run with:
//   node --env-file=.env --import tsx scripts/faucet.ts
import { createServer, type IncomingMessage } from "node:http";
import { drip, health, issueNonce, mintTest, verifyAndMint } from "../server/faucetCore";

const PORT = Number(process.env.FAUCET_PORT ?? 8788);
const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function clientIp(req: IncomingMessage): string {
  const xff = req.headers["x-forwarded-for"];
  const raw = Array.isArray(xff) ? xff[0] : (xff ?? "");
  return raw.split(",")[0]?.trim() || req.socket.remoteAddress || "local";
}

function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try {
        resolve(JSON.parse(data || "{}") as Record<string, unknown>);
      } catch {
        resolve({});
      }
    });
  });
}

const server = createServer(async (req, res) => {
  const send = (status: number, body: unknown) => {
    res.writeHead(status, { "Content-Type": "application/json", ...CORS });
    res.end(JSON.stringify(body));
  };
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS);
    res.end();
    return;
  }
  const ip = clientIp(req);
  const domain = req.headers.host ?? "localhost";
  try {
    if (req.method === "GET" && req.url === "/health") {
      const r = await health();
      send(r.status, r.body);
    } else if (req.method === "POST" && req.url === "/drip") {
      const r = await drip(await readJson(req), ip);
      send(r.status, r.body);
    } else if (req.method === "POST" && req.url === "/mint-test") {
      const r = await mintTest(await readJson(req), ip);
      send(r.status, r.body);
    } else if (req.method === "POST" && req.url === "/auth/nonce") {
      const r = await issueNonce(await readJson(req), ip, domain);
      send(r.status, r.body);
    } else if (req.method === "POST" && req.url === "/auth/token") {
      const r = await verifyAndMint(await readJson(req));
      send(r.status, r.body);
    } else {
      send(404, { error: "Not found" });
    }
  } catch (err) {
    console.error(err);
    send(500, { error: "Server error, please try again." });
  }
});

server.listen(PORT, () => {
  console.log(`Hush dev backend on http://localhost:${PORT} (Supabase-backed state)`);
});
