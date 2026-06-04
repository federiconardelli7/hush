import { EERC_DECIMALS } from "@/features/eerc/config/contracts";

// Format a plain decimal string (decimals already applied) as USD: "$1,284.50".
export function formatMoney(parsed: string): string {
  const n = Number(parsed);
  if (!parsed || Number.isNaN(n)) return "$0.00";
  return `$${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: EERC_DECIMALS,
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
