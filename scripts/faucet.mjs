import { createServer } from "node:http";
import { createHmac, randomUUID } from "node:crypto";
import {
  createPublicClient,
  createWalletClient,
  formatEther,
  http,
  isAddress,
  parseEther,
  verifyMessage,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { avalancheFuji } from "viem/chains";

// Local dev backend for Hush. Holds server-only secrets and exposes:
//   GET  /health      — faucet status
//   POST /drip         — drip Fuji gas to a fresh embedded wallet
//   POST /auth/nonce   — issue a single-use nonce + message to sign
//   POST /auth/token   — verify the wallet signature, mint a Supabase JWT
// In production these become serverless/Edge functions; the key never ships to
// the client. Run from hush/: `node --env-file=.env scripts/faucet.mjs`
const PK = process.env.FAUCET_PRIVATE_KEY;
if (!PK) {
  console.error("FAUCET_PRIVATE_KEY is not set — run with `node --env-file=.env`.");
  process.exit(1);
}

const RPC =
  process.env.EXPO_PUBLIC_FUJI_RPC ?? "https://api.avax-test.network/ext/bc/C/rpc";
const PORT = Number(process.env.FAUCET_PORT ?? 8788);
const DRIP = parseEther(process.env.FAUCET_DRIP_AVAX ?? "0.1");
const MIN_RECIPIENT = parseEther(process.env.FAUCET_MIN_RECIPIENT ?? "0.05");
const COOLDOWN_MS = Number(process.env.FAUCET_COOLDOWN_MS ?? 5 * 60 * 1000);

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;
const SUPABASE_REF = process.env.SUPABASE_PROJECT_REF;
const NONCE_TTL_MS = 5 * 60 * 1000;
const TOKEN_TTL_S = 60 * 60; // 1h Supabase session

const account = privateKeyToAccount(PK);
const publicClient = createPublicClient({ chain: avalancheFuji, transport: http(RPC) });
const walletClient = createWalletClient({ account, chain: avalancheFuji, transport: http(RPC) });

const lastDrip = new Map(); // lowercased address -> timestamp
const nonces = new Map(); // nonce -> { address, message, expires }

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json", ...cors });
  res.end(JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try {
        resolve(JSON.parse(data || "{}"));
      } catch {
        resolve({});
      }
    });
  });
}

function b64url(input) {
  return Buffer.from(input).toString("base64url");
}

// Mint a Supabase-compatible HS256 JWT (validated by PostgREST against the
// project's legacy JWT secret). RLS reads the `wallet_address` claim.
function mintSupabaseToken(addressLower) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64url(
    JSON.stringify({
      iss: "supabase",
      ref: SUPABASE_REF,
      role: "authenticated",
      aud: "authenticated",
      sub: addressLower,
      wallet_address: addressLower,
      iat: now,
      exp: now + TOKEN_TTL_S,
    }),
  );
  const data = `${header}.${payload}`;
  const sig = createHmac("sha256", SUPABASE_JWT_SECRET).update(data).digest("base64url");
  return { token: `${data}.${sig}`, expiresAt: (now + TOKEN_TTL_S) * 1000 };
}

function pruneNonces() {
  const now = Date.now();
  for (const [k, v] of nonces) if (v.expires < now) nonces.delete(k);
}

const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, cors);
    res.end();
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    const balance = await publicClient.getBalance({ address: account.address });
    send(res, 200, {
      ok: true,
      faucet: account.address,
      balanceAvax: formatEther(balance),
      chainId: avalancheFuji.id,
      authConfigured: Boolean(SUPABASE_JWT_SECRET && SUPABASE_REF),
    });
    return;
  }

  if (req.method === "POST" && req.url === "/drip") {
    const { address } = await readJson(req);
    if (!address || !isAddress(address)) {
      send(res, 400, { error: "Invalid address" });
      return;
    }
    const key = address.toLowerCase();
    if (Date.now() - (lastDrip.get(key) ?? 0) < COOLDOWN_MS) {
      send(res, 429, { error: "Cooldown active; try again in a few minutes." });
      return;
    }
    try {
      const [recipientBalance, faucetBalance] = await Promise.all([
        publicClient.getBalance({ address }),
        publicClient.getBalance({ address: account.address }),
      ]);
      if (recipientBalance >= MIN_RECIPIENT) {
        send(res, 200, { ok: true, skipped: true, reason: "Recipient already funded" });
        return;
      }
      if (faucetBalance < DRIP) {
        send(res, 503, { error: `Faucet is empty — fund ${account.address} with Fuji AVAX.` });
        return;
      }
      lastDrip.set(key, Date.now());
      const hash = await walletClient.sendTransaction({ to: address, value: DRIP });
      console.log(`drip ${formatEther(DRIP)} AVAX -> ${address}  ${hash}`);
      send(res, 200, { ok: true, txHash: hash });
    } catch (err) {
      lastDrip.delete(key);
      send(res, 500, { error: err instanceof Error ? err.message : String(err) });
    }
    return;
  }

  // Issue a single-use nonce + the exact message the wallet must sign.
  if (req.method === "POST" && req.url === "/auth/nonce") {
    const { address } = await readJson(req);
    if (!address || !isAddress(address)) {
      send(res, 400, { error: "Invalid address" });
      return;
    }
    pruneNonces();
    const nonce = randomUUID();
    const message = `Hush authentication\n\nWallet: ${address}\nNonce: ${nonce}\nIssued: ${new Date().toISOString()}`;
    nonces.set(nonce, {
      address: address.toLowerCase(),
      message,
      expires: Date.now() + NONCE_TTL_MS,
    });
    send(res, 200, { nonce, message });
    return;
  }

  // Verify the signature recovers the address, then mint a Supabase JWT.
  if (req.method === "POST" && req.url === "/auth/token") {
    if (!SUPABASE_JWT_SECRET || !SUPABASE_REF) {
      send(res, 503, {
        error: "Auth not configured — set SUPABASE_JWT_SECRET + SUPABASE_PROJECT_REF.",
      });
      return;
    }
    const { address, nonce, signature } = await readJson(req);
    const entry = nonce ? nonces.get(nonce) : undefined;
    if (!entry || !address || entry.address !== address.toLowerCase()) {
      send(res, 400, { error: "Unknown or mismatched nonce." });
      return;
    }
    if (entry.expires < Date.now()) {
      nonces.delete(nonce);
      send(res, 400, { error: "Nonce expired; request a new one." });
      return;
    }
    try {
      // EOA-only: do NOT pass a `client` here — that would enable the
      // ERC-1271/6492 contract-signature path (an attacker-deployed contract
      // could authenticate as its own address). Privy embedded wallets are EOAs.
      const valid = await verifyMessage({
        address,
        message: entry.message,
        signature,
      });
      if (!valid) {
        send(res, 401, { error: "Signature does not match the wallet." });
        return;
      }
      nonces.delete(nonce); // single use
      const { token, expiresAt } = mintSupabaseToken(address.toLowerCase());
      console.log(`auth token minted -> ${address}`);
      send(res, 200, { token, expiresAt });
    } catch (err) {
      send(res, 500, { error: err instanceof Error ? err.message : String(err) });
    }
    return;
  }

  send(res, 404, { error: "Not found" });
});

server.listen(PORT, () => {
  console.log(
    `Hush dev backend on http://localhost:${PORT} (faucet ${account.address}, drip ${formatEther(DRIP)} AVAX, auth ${
      SUPABASE_JWT_SECRET && SUPABASE_REF ? "ready" : "NOT configured"
    })`,
  );
});
