// Map a raw on-chain / viem error to a short, user-friendly line — never surface the
// calldata dump or revert internals to the user.
export function friendlyTxError(
  err: unknown,
  opts: { insufficient: string; fallback: string },
): string {
  const msg = (err instanceof Error ? err.message : String(err)).trim();
  if (/exceeds balance|insufficient|exceeds the balance|amount exceeds/i.test(msg)) {
    return opts.insufficient;
  }
  // Pass through messages we threw ourselves (short, already user-facing — e.g.
  // "… hasn't joined Hush yet."); only fall back for raw viem/revert dumps.
  const looksRaw =
    msg.length > 120 ||
    /0x[0-9a-fA-F]{10,}|reverted|execution reverted|viem|contract call|request arguments/i.test(msg);
  if (msg && !looksRaw) return msg;
  return opts.fallback;
}
