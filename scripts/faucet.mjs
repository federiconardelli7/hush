import { createServer } from "node:http";
import {
  createPublicClient,
  createWalletClient,
  formatEther,
  http,
  isAddress,
  parseEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { avalancheFuji } from "viem/chains";

// Local AVAX faucet for Hush. Holds a dedicated throwaway key server-side and
// drips Fuji gas to new embedded wallets so users never need an external wallet.
// Run from hush/: `node --env-file=.env scripts/faucet.mjs`
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

const account = privateKeyToAccount(PK);
const publicClient = createPublicClient({ chain: avalancheFuji, transport: http(RPC) });
const walletClient = createWalletClient({ account, chain: avalancheFuji, transport: http(RPC) });

const lastDrip = new Map(); // lowercased address -> timestamp

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
        send(res, 503, {
          error: `Faucet is empty — fund ${account.address} with Fuji AVAX.`,
        });
        return;
      }
      lastDrip.set(key, Date.now());
      const hash = await walletClient.sendTransaction({ to: address, value: DRIP });
      console.log(`drip ${formatEther(DRIP)} AVAX -> ${address}  ${hash}`);
      send(res, 200, { ok: true, txHash: hash });
    } catch (err) {
      lastDrip.delete(key); // allow a retry after a failure
      send(res, 500, { error: err instanceof Error ? err.message : String(err) });
    }
    return;
  }

  send(res, 404, { error: "Not found" });
});

server.listen(PORT, () => {
  console.log(
    `Hush faucet on http://localhost:${PORT} (faucet ${account.address}, drip ${formatEther(DRIP)} AVAX)`,
  );
});
