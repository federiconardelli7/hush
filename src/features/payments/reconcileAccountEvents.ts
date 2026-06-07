import type { PublicClient } from "viem";
import { CONTRACTS, CONVERTER_DEPLOY_BLOCK } from "@/features/eerc/config/contracts";
import { accountEventsRepo } from "@/features/payments/accountEventsRepo";

// `account_events` is a projection of on-chain truth: every deposit/withdraw emits an
// event carrying the user (indexed), but the row is written client-side AFTER the tx,
// and that write can fail (e.g. an expired Supabase JWT). This reconcile reads the
// converter's Deposit/Withdraw logs for the user and backfills any missing row, so
// Activity always converges to the chain (closes F-13). Chain = source of truth, DB =
// cache; this is eventual consistency, not (impossible) chain+DB atomicity.

// Fuji's public RPC caps eth_getLogs at ~2048 blocks per call, so scan in windows.
const LOG_WINDOW = 2000n;

const depositEvent = {
  type: "event",
  name: "Deposit",
  inputs: [
    { name: "user", type: "address", indexed: true },
    { name: "amount", type: "uint256", indexed: false },
    { name: "dust", type: "uint256", indexed: false },
    { name: "tokenId", type: "uint256", indexed: false },
  ],
} as const;

const withdrawEvent = {
  type: "event",
  name: "Withdraw",
  inputs: [
    { name: "user", type: "address", indexed: true },
    { name: "amount", type: "uint256", indexed: false },
    { name: "tokenId", type: "uint256", indexed: false },
    { name: "auditorPCT", type: "uint256[7]", indexed: false },
    { name: "auditorAddress", type: "address", indexed: true },
  ],
} as const;

// Remember the last scanned block per address so repeat loads only cover the new tail
// (the first scan walks deploy→head; later ones are ~one window). localStorage, not
// sessionStorage: it's a cheap optimization, fine to share across tabs and survive close.
const cursorKey = (address: string) => `hush:reconcile-block:v1:${address.toLowerCase()}`;

function readCursor(address: string): bigint | null {
  try {
    const raw = window.localStorage?.getItem(cursorKey(address));
    return raw ? BigInt(raw) : null;
  } catch {
    return null;
  }
}

function writeCursor(address: string, block: bigint): void {
  try {
    window.localStorage?.setItem(cursorKey(address), block.toString());
  } catch {
    // storage blocked — next run just rescans from the deploy block (still correct)
  }
}

type FoundEvent = { txHash: `0x${string}`; kind: "deposit" | "withdraw"; block: bigint };

// Backfills any on-chain deposit/withdraw for `address` that's missing from the DB.
// Best-effort and idempotent; returns the number of rows inserted.
export async function reconcileAccountEvents(
  publicClient: PublicClient,
  address: string,
): Promise<number> {
  const user = address.toLowerCase() as `0x${string}`;
  const head = await publicClient.getBlockNumber();
  const cursor = readCursor(user);
  // Re-scan one window behind the cursor so a log indexed late isn't skipped (idempotent).
  const fromBlock =
    cursor && cursor > CONVERTER_DEPLOY_BLOCK ? cursor - LOG_WINDOW : CONVERTER_DEPLOY_BLOCK;
  const start0 = fromBlock < CONVERTER_DEPLOY_BLOCK ? CONVERTER_DEPLOY_BLOCK : fromBlock;
  if (start0 > head) return 0;

  const converter = CONTRACTS.encryptedERC as `0x${string}`;
  const found: FoundEvent[] = [];
  for (let start = start0; start <= head; start += LOG_WINDOW) {
    const toBlock = start + LOG_WINDOW - 1n > head ? head : start + LOG_WINDOW - 1n;
    const [deposits, withdraws] = await Promise.all([
      publicClient.getLogs({ address: converter, event: depositEvent, args: { user }, fromBlock: start, toBlock }),
      publicClient.getLogs({ address: converter, event: withdrawEvent, args: { user }, fromBlock: start, toBlock }),
    ]);
    for (const log of deposits) {
      if (log.transactionHash && log.blockNumber !== null) {
        found.push({ txHash: log.transactionHash, kind: "deposit", block: log.blockNumber });
      }
    }
    for (const log of withdraws) {
      if (log.transactionHash && log.blockNumber !== null) {
        found.push({ txHash: log.transactionHash, kind: "withdraw", block: log.blockNumber });
      }
    }
  }

  const recorded = new Set(
    (await accountEventsRepo.mine(user)).map((e) => e.tx_hash.toLowerCase()),
  );
  const missing = found.filter((f) => !recorded.has(f.txHash.toLowerCase()));

  if (missing.length > 0) {
    // Stamp each missing row with its block time so it sorts correctly in Activity
    // (rather than jumping to "now").
    const times = new Map<bigint, string>();
    await Promise.all(
      [...new Set(missing.map((m) => m.block))].map(async (block) => {
        const b = await publicClient.getBlock({ blockNumber: block });
        times.set(block, new Date(Number(b.timestamp) * 1000).toISOString());
      }),
    );
    await accountEventsRepo.backfill(
      missing.map((m) => ({
        tx_hash: m.txHash,
        address: user,
        kind: m.kind,
        created_at: times.get(m.block) ?? new Date().toISOString(),
      })),
    );
  }

  writeCursor(user, head);
  return missing.length;
}
