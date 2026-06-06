import type { TokenInfo } from "@/features/eerc/tokens/registry";

// Format a plain decimal string (decimals already applied) as USD: "$1,284.50".
// Always 2 dp for display, independent of the ledger's internal precision — the
// converter is now 6 dp (D-35), so this must NOT key off EERC_DECIMALS.
export function formatMoney(parsed: string): string {
  const n = Number(parsed);
  if (!parsed || Number.isNaN(n)) return "$0.00";
  return `$${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// Signed amount for an Activity row: "+ $24.00" (money in) / "− $610.00" (money out).
// null = not decryptable → "$—".
export function formatSignedMoney(
  parsed: string | null,
  positive: boolean,
): string {
  if (parsed === null) return "$—";
  return `${positive ? "+ " : "− "}${formatMoney(parsed)}`;
}

// Token-aware amount: USD-pegged tokens render "$X.XX"; a future non-dollar token
// (AVAX, F-16) renders "X.XX SYMBOL". Decimals already applied (converter's 6 dp).
export function formatTokenAmount(parsed: string, token: TokenInfo): string {
  const n = Number(parsed);
  if (!parsed || Number.isNaN(n)) {
    return token.usdPegged ? "$0.00" : `0 ${token.symbol}`;
  }
  const num = n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: token.usdPegged ? 2 : 6,
  });
  return token.usdPegged ? `$${num}` : `${num} ${token.symbol}`;
}

// Signed token amount for an Activity row. null = not decryptable → "$—".
export function formatSignedToken(
  parsed: string | null,
  positive: boolean,
  token: TokenInfo,
): string {
  if (parsed === null) return "$—";
  return `${positive ? "+ " : "− "}${formatTokenAmount(parsed, token)}`;
}
