// Framework-agnostic faucet/auth core, shared by the Vercel `/api` functions and the
// local dev server (`scripts/faucet.ts`). Holds server-only secrets (faucet key,
// Supabase JWT secret) and exposes the four operations the app needs:
//   drip        — send Fuji gas to a fresh embedded wallet
//   mintTest    — mint the TEST ERC20 so a wallet has something to deposit
//   issueNonce  — hand out a single-use, domain-bound message to sign
//   verifyAndMint — verify the signature (EOA-only) and mint a Supabase JWT
// State (nonces + rate limits) lives in Supabase so this stays correct on stateless
// serverless. Each function returns { status, body } and never throws to the caller;
// internal errors are logged server-side and surfaced as a generic message (F-9).
import { createHmac, randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  createPublicClient,
  createWalletClient,
  erc20Abi,
  formatEther,
  http,
  isAddress,
  parseEther,
  parseUnits,
  verifyMessage,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { avalancheFuji } from "viem/chains";

export type FaucetResult = { status: number; body: Record<string, unknown> };

const RPC = process.env.EXPO_PUBLIC_FUJI_RPC ?? "https://api.avax-test.network/ext/bc/C/rpc";
const DRIP = parseEther(process.env.FAUCET_DRIP_AVAX ?? "0.1");
const MIN_RECIPIENT = parseEther(process.env.FAUCET_MIN_RECIPIENT ?? "0.05");
// Guard against a malformed env value → NaN, which would otherwise disable the cooldown.
const COOLDOWN_RAW = Number(process.env.FAUCET_COOLDOWN_MS);
const ADDRESS_COOLDOWN_MS = Number.isFinite(COOLDOWN_RAW) ? COOLDOWN_RAW : 5 * 60 * 1000;
const NONCE_TTL_MS = 5 * 60 * 1000;
const TOKEN_TTL_S = 60 * 60; // 1h Supabase session
const MINT_TEST = parseUnits(process.env.FAUCET_MINT_TEST ?? "100000", 18);
// Per-IP burst caps (lenient — shared NAT/wifi must still work for a demo).
const IP_WINDOW_MS = 60 * 1000;
const IP_MAX: Record<string, number> = { drip: 20, mint: 20, nonce: 30 };

const MINT_ABI = [
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

// Lazy singletons so a missing env var fails inside a handler (→ generic 5xx) rather
// than crashing module import.
let cachedChain: ReturnType<typeof buildChain> | null = null;
function buildChain() {
  const pk = process.env.FAUCET_PRIVATE_KEY;
  if (!pk) throw new Error("FAUCET_PRIVATE_KEY is not set");
  const account = privateKeyToAccount(pk as `0x${string}`);
  return {
    account,
    publicClient: createPublicClient({ chain: avalancheFuji, transport: http(RPC) }),
    walletClient: createWalletClient({ account, chain: avalancheFuji, transport: http(RPC) }),
  };
}
function chain() {
  if (!cachedChain) cachedChain = buildChain();
  return cachedChain;
}

let cachedAdmin: SupabaseClient | null = null;
function admin(): SupabaseClient {
  if (cachedAdmin) return cachedAdmin;
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase admin env (URL / SERVICE_ROLE_KEY) is not set");
  cachedAdmin = createClient(url, key, { auth: { persistSession: false } });
  return cachedAdmin;
}

// Atomic sliding-window limiter (the faucet_rate_hit SQL function does the bump + window
// reset in one statement, returning whether we're still within the cap). (windowMs, 1) is
// a one-per-window cooldown; (60s, 20) a burst cap. Atomic so concurrent serverless
// invocations can't both pass the cap.
async function allow(
  identifier: string,
  action: string,
  windowMs: number,
  max: number,
): Promise<boolean> {
  const { data, error } = await admin().rpc("faucet_rate_hit", {
    p_identifier: identifier,
    p_action: action,
    p_window_ms: windowMs,
    p_max: max,
  });
  if (error) throw error;
  return data === true;
}

const ipKey = (ip: string) => `ip:${ip}`;

// Supabase-compatible HS256 JWT (validated by PostgREST against the project's legacy
// JWT secret). RLS reads the `wallet_address` claim. Payload unchanged from the
// original dev backend.
function mintSupabaseToken(addressLower: string): { token: string; expiresAt: number } {
  const secret = process.env.SUPABASE_JWT_SECRET;
  const ref = process.env.SUPABASE_PROJECT_REF;
  if (!secret || !ref) throw new Error("SUPABASE_JWT_SECRET / SUPABASE_PROJECT_REF not set");
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const header = b64({ alg: "HS256", typ: "JWT" });
  const payload = b64({
    iss: "supabase",
    ref,
    role: "authenticated",
    aud: "authenticated",
    sub: addressLower,
    wallet_address: addressLower,
    iat: now,
    exp: now + TOKEN_TTL_S,
  });
  const data = `${header}.${payload}`;
  const sig = createHmac("sha256", secret).update(data).digest("base64url");
  return { token: `${data}.${sig}`, expiresAt: (now + TOKEN_TTL_S) * 1000 };
}

// Wrap a handler body so internal errors are logged but never leaked to the client (F-9).
async function guard(fn: () => Promise<FaucetResult>): Promise<FaucetResult> {
  try {
    return await fn();
  } catch (err) {
    console.error(err);
    return { status: 500, body: { error: "Server error, please try again." } };
  }
}

export async function health(): Promise<FaucetResult> {
  return guard(async () => {
    const { account, publicClient } = chain();
    const balance = await publicClient.getBalance({ address: account.address });
    return {
      status: 200,
      body: {
        ok: true,
        faucet: account.address,
        balanceAvax: formatEther(balance),
        chainId: avalancheFuji.id,
        authConfigured: Boolean(
          process.env.SUPABASE_JWT_SECRET && process.env.SUPABASE_PROJECT_REF,
        ),
      },
    };
  });
}

export async function drip(body: Record<string, unknown>, ip: string): Promise<FaucetResult> {
  return guard(async () => {
    const address = body.address;
    if (typeof address !== "string" || !isAddress(address))
      return { status: 400, body: { error: "Invalid address" } };
    const key = address.toLowerCase();
    if (!(await allow(ipKey(ip), "drip", IP_WINDOW_MS, IP_MAX.drip)))
      return { status: 429, body: { error: "Too many requests; slow down." } };
    if (!(await allow(key, "drip", ADDRESS_COOLDOWN_MS, 1)))
      return { status: 429, body: { error: "Cooldown active; try again in a few minutes." } };

    const { account, publicClient, walletClient } = chain();
    const [recipientBalance, faucetBalance] = await Promise.all([
      publicClient.getBalance({ address }),
      publicClient.getBalance({ address: account.address }),
    ]);
    if (recipientBalance >= MIN_RECIPIENT)
      return { status: 200, body: { ok: true, skipped: true, reason: "Recipient already funded" } };
    if (faucetBalance < DRIP)
      return { status: 503, body: { error: "Faucet is empty; try again later." } };

    const hash = await walletClient.sendTransaction({
      account,
      chain: avalancheFuji,
      to: address,
      value: DRIP,
    });
    console.log(`drip ${formatEther(DRIP)} AVAX -> ${address}  ${hash}`);
    return { status: 200, body: { ok: true, txHash: hash } };
  });
}

export async function mintTest(body: Record<string, unknown>, ip: string): Promise<FaucetResult> {
  return guard(async () => {
    const testErc20 = process.env.EXPO_PUBLIC_ERC20 as `0x${string}` | undefined;
    if (!testErc20) return { status: 503, body: { error: "Test token not configured." } };
    const address = body.address;
    if (typeof address !== "string" || !isAddress(address))
      return { status: 400, body: { error: "Invalid address" } };
    const key = address.toLowerCase();
    if (!(await allow(ipKey(ip), "mint", IP_WINDOW_MS, IP_MAX.mint)))
      return { status: 429, body: { error: "Too many requests; slow down." } };
    if (!(await allow(key, "mint", ADDRESS_COOLDOWN_MS, 1)))
      return { status: 429, body: { error: "Cooldown active; try again in a few minutes." } };

    const { account, publicClient, walletClient } = chain();
    const balance = await publicClient.readContract({
      address: testErc20,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [address],
    });
    if (balance >= MINT_TEST)
      return { status: 200, body: { ok: true, skipped: true, reason: "Already has test tokens" } };
    const hash = await walletClient.writeContract({
      account,
      chain: avalancheFuji,
      address: testErc20,
      abi: MINT_ABI,
      functionName: "mint",
      args: [address, MINT_TEST],
    });
    console.log(`mint TEST -> ${address}  ${hash}`);
    return { status: 200, body: { ok: true, txHash: hash } };
  });
}

export async function issueNonce(
  body: Record<string, unknown>,
  ip: string,
  domain: string,
): Promise<FaucetResult> {
  return guard(async () => {
    const address = body.address;
    if (typeof address !== "string" || !isAddress(address))
      return { status: 400, body: { error: "Invalid address" } };
    if (!(await allow(ipKey(ip), "nonce", IP_WINDOW_MS, IP_MAX.nonce)))
      return { status: 429, body: { error: "Too many requests; slow down." } };

    const db = admin();
    // Opportunistic cleanup of expired nonces.
    await db.from("faucet_nonces").delete().lt("expires_at", new Date().toISOString());

    const nonce = randomUUID();
    // F-8: bind the signed message to the chain + the issuing domain so a signature can't
    // be replayed against another environment that shares our JWT secret. Prefer a
    // server-configured domain over the client-controlled Host header (fall back to it
    // only in local dev where FAUCET_PUBLIC_DOMAIN is unset).
    const boundDomain = process.env.FAUCET_PUBLIC_DOMAIN ?? domain;
    const message =
      `Hush authentication\n\n` +
      `Chain: Avalanche Fuji (43113)\n` +
      `Domain: ${boundDomain}\n` +
      `Wallet: ${address}\n` +
      `Nonce: ${nonce}\n` +
      `Issued: ${new Date().toISOString()}`;
    const { error } = await db.from("faucet_nonces").insert({
      nonce,
      address: address.toLowerCase(),
      message,
      expires_at: new Date(Date.now() + NONCE_TTL_MS).toISOString(),
    });
    if (error) throw error;
    return { status: 200, body: { nonce, message } };
  });
}

export async function verifyAndMint(body: Record<string, unknown>): Promise<FaucetResult> {
  return guard(async () => {
    if (!process.env.SUPABASE_JWT_SECRET || !process.env.SUPABASE_PROJECT_REF)
      return { status: 503, body: { error: "Auth not configured." } };
    const address = body.address;
    const nonce = body.nonce;
    const signature = body.signature;
    if (
      typeof address !== "string" ||
      !isAddress(address) ||
      typeof nonce !== "string" ||
      typeof signature !== "string"
    )
      return { status: 400, body: { error: "Missing address, nonce, or signature." } };

    const db = admin();
    // Atomic single-use: claim (delete) the nonce up front, scoped to this address. The
    // DELETE … RETURNING has exactly one winner, so a signature can't be redeemed twice
    // even under concurrent requests (TOCTOU-safe), and the address match is enforced by
    // the delete filter (no row back → unknown or mismatched).
    const { data: entry } = await db
      .from("faucet_nonces")
      .delete()
      .eq("nonce", nonce)
      .eq("address", address.toLowerCase())
      .select("message,expires_at")
      .maybeSingle();
    if (!entry) return { status: 400, body: { error: "Unknown or mismatched nonce." } };
    if (new Date(entry.expires_at as string).getTime() < Date.now())
      return { status: 400, body: { error: "Nonce expired; request a new one." } };

    // EOA-only: do NOT pass a `client` here — that enables the ERC-1271/6492
    // contract-signature path (an attacker-deployed contract could authenticate as
    // its own address). Privy embedded wallets are EOAs.
    const valid = await verifyMessage({
      address,
      message: entry.message as string,
      signature: signature as `0x${string}`,
    });
    if (!valid) return { status: 401, body: { error: "Signature does not match the wallet." } };

    const { token, expiresAt } = mintSupabaseToken(address.toLowerCase());
    console.log(`auth token minted -> ${address}`);
    return { status: 200, body: { token, expiresAt } };
  });
}
