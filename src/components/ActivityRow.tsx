import Feather from "@expo/vector-icons/Feather";
import { useQuery } from "@tanstack/react-query";
import { StyleSheet, Text, View } from "react-native";
import { Avatar } from "@/design-system/primitives/Avatar";
import { Skeleton } from "@/design-system/primitives/Skeleton";
import { useTheme } from "@/design-system/theme";
import { spacing } from "@/design-system/tokens";
import { fonts } from "@/design-system/typography";
import { useEerc } from "@/features/eerc/useEerc";
import { formatRowDateTime, formatShortDate } from "@/features/payments/dateGroups";
import type { ActivityEntry } from "@/features/payments/useActivity";
import { displayName } from "@/lib/identity";
import { formatSignedToken } from "@/lib/money";

const CASH_META: Record<
  "deposit" | "withdraw",
  { icon: keyof typeof Feather.glyphMap; label: string }
> = {
  deposit: { icon: "arrow-down-left", label: "Added money" },
  withdraw: { icon: "arrow-up-right", label: "Cashed out" },
};

// Column widths shared by the desktop Activity table header (activity.tsx) and
// the "table" variant below, so headers and cells stay aligned. Note = flex:1.
export const ACTIVITY_COLS = { who: 250, amount: 120 } as const;

// One Activity row across all kinds: transfers show the counterparty + note;
// deposit/withdraw show an icon tile + "Added money" / "Cashed out". The amount
// (green +money-in / red −money-out) is decrypted on-chain per tx and cached;
// it only runs once the decryption key is unlocked.
export function ActivityRow({
  item,
  variant = "list",
}: {
  item: ActivityEntry;
  variant?: "list" | "table";
}) {
  const { colors } = useTheme();
  const eerc = useEerc();
  const isTransfer = item.kind === "sent" || item.kind === "received";
  const positive = item.kind === "received" || item.kind === "deposit";

  const amount = useQuery({
    queryKey: ["tx-amount", item.tx_hash],
    enabled: eerc.isDecryptionKeySet,
    staleTime: Infinity,
    // A just-sent tx can lag the RPC when the row first renders, so decryptAmount
    // returns null transiently. Throw on null so React Query retries instead of
    // caching the empty result forever (that was the "amount shows — until you
    // refresh" bug). A genuinely un-decryptable row settles to "—" after retries.
    retry: 4,
    retryDelay: 1500,
    queryFn: async () => {
      const value = await eerc.decryptAmount(item.tx_hash, item.kind);
      if (!value) throw new Error("amount not ready");
      return value; // { amount, token } — token badge distinguishes TEST vs USDC
    },
  });

  const memo = useQuery({
    queryKey: ["tx-memo", item.tx_hash],
    enabled: eerc.isDecryptionKeySet && isTransfer && !item.caption,
    staleTime: Infinity,
    queryFn: () => eerc.decryptMemo(item.tx_hash),
  });

  const name = isTransfer
    ? displayName(item.counterparty, item.counterpartyAddress ?? "")
    : CASH_META[item.kind as "deposit" | "withdraw"].label;
  const note = isTransfer
    ? (item.caption ?? memo.data ?? "")
    : amount.data
      ? `${amount.data.token.symbol} · Avalanche Fuji`
      : "Avalanche Fuji";

  const locked = !eerc.isDecryptionKeySet;
  let amountText: string;
  if (amount.isPending) amountText = "···";
  else if (!amount.data) amountText = "—";
  else amountText = formatSignedToken(amount.data.amount, positive, amount.data.token);
  const hasAmount = eerc.isDecryptionKeySet && amount.data != null;
  const tokenSym = amount.data?.token.symbol;

  const leading = isTransfer ? (
    <Avatar name={name} size={36} />
  ) : (
    <View style={[styles.icon, styles.iconSm, { backgroundColor: colors.chip }]}>
      <Feather
        name={CASH_META[item.kind as "deposit" | "withdraw"].icon}
        size={16}
        color={colors.ink}
      />
    </View>
  );
  const amountColor = hasAmount
    ? positive
      ? colors.positive
      : colors.avRed
    : colors.sub;

  if (variant === "table") {
    return (
      <View style={styles.tRow}>
        <View style={styles.tWho}>
          {leading}
          <View style={styles.tWhoText}>
            <Text style={[styles.name, { color: colors.ink }]} numberOfLines={1}>
              {name}
            </Text>
            <Text style={[styles.time, { color: colors.sub }]} numberOfLines={1}>
              {formatRowDateTime(item.created_at)}
            </Text>
          </View>
        </View>
        <Text
          style={[styles.tNote, { color: note ? colors.sub : colors.line }]}
          numberOfLines={1}
        >
          {note || "—"}
        </Text>
        <View style={styles.tAmount}>
          {locked ? (
            <Feather name="lock" size={14.5} color={colors.sub} />
          ) : (
            <>
              {amount.isPending ? (
                <Skeleton width={48} height={14} />
              ) : (
                <Text style={[styles.amount, { color: amountColor }]}>{amountText}</Text>
              )}
              {hasAmount && tokenSym ? (
                <Text style={[styles.tokenTag, { color: colors.sub }]}>{tokenSym}</Text>
              ) : null}
            </>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      {isTransfer ? (
        <Avatar name={name} size={42} />
      ) : (
        <View style={[styles.icon, { backgroundColor: colors.chip }]}>
          <Feather
            name={CASH_META[item.kind as "deposit" | "withdraw"].icon}
            size={19}
            color={colors.ink}
          />
        </View>
      )}
      <View style={styles.who}>
        <Text style={[styles.name, { color: colors.ink }]} numberOfLines={1}>
          {name}
        </Text>
        {note ? (
          <Text style={[styles.note, { color: colors.sub }]} numberOfLines={1}>
            {note}
          </Text>
        ) : null}
      </View>
      <View style={styles.right}>
        {locked ? (
          <Feather name="lock" size={14.5} color={colors.sub} />
        ) : amount.isPending ? (
          <Skeleton width={48} height={14} />
        ) : (
          <Text
            style={[
              styles.amount,
              {
                color: hasAmount
                  ? positive
                    ? colors.positive
                    : colors.avRed
                  : colors.sub,
              },
            ]}
          >
            {amountText}
          </Text>
        )}
        {hasAmount && tokenSym ? (
          <Text style={[styles.tokenTag, { color: colors.sub }]}>{tokenSym}</Text>
        ) : null}
        <Text style={[styles.time, { color: colors.sub }]}>
          {formatShortDate(item.created_at)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 13, paddingVertical: 13 },
  icon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  who: { flex: 1, minWidth: 0 },
  name: { fontFamily: fonts.ui, fontSize: 14.5, fontWeight: "600" },
  note: { fontFamily: fonts.ui, fontSize: 12, marginTop: 1 },
  right: { alignItems: "flex-end" },
  amount: { fontFamily: fonts.ui, fontSize: 14.5, fontWeight: "700" },
  time: { fontFamily: fonts.ui, fontSize: 10.5, marginTop: 1 },
  tokenTag: { fontFamily: fonts.ui, fontSize: 10.5, fontWeight: "700", marginTop: 1 },
  // Desktop "table" variant — cells aligned to the activity.tsx header columns.
  iconSm: { width: 36, height: 36, borderRadius: 18 },
  tRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14 },
  tWho: {
    flexBasis: ACTIVITY_COLS.who,
    flexGrow: 0,
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  tWhoText: { flexShrink: 1, minWidth: 0 },
  tNote: { flex: 1, fontFamily: fonts.ui, fontSize: 13.5, paddingRight: spacing.md },
  tAmount: {
    flexBasis: ACTIVITY_COLS.amount,
    flexGrow: 0,
    flexShrink: 0,
    alignItems: "flex-end",
    justifyContent: "center",
  },
});
