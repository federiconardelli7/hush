import { router } from "expo-router";
import { useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ActivityRow } from "@/components/ActivityRow";
import { RequestRow } from "@/components/RequestRow";
import { Button } from "@/design-system/primitives/Button";
import { ScreenContainer } from "@/design-system/primitives/ScreenContainer";
import { useTheme } from "@/design-system/theme";
import { radius, spacing } from "@/design-system/tokens";
import { fonts, typeScale } from "@/design-system/typography";
import { useEerc } from "@/features/eerc/useEerc";
import { groupByDate } from "@/features/payments/dateGroups";
import { useActivity } from "@/features/payments/useActivity";
import { useRequests } from "@/features/requests/useRequests";
import { displayName } from "@/lib/identity";

const FILTERS = ["All", "Sent", "Received", "Added/Out", "Requests"] as const;

const DAY = 86_400_000;
type RangeId = "all" | "today" | "24h" | "week" | "month" | "custom";
const RANGES: { id: RangeId; label: string }[] = [
  { id: "all", label: "All time" },
  { id: "today", label: "Today" },
  { id: "24h", label: "Last 24h" },
  { id: "week", label: "Last week" },
  { id: "month", label: "Last month" },
  { id: "custom", label: "Custom" },
];
const RANGE_LABEL: Record<RangeId, string> = Object.fromEntries(
  RANGES.map((r) => [r.id, r.label]),
) as Record<RangeId, string>;

const parseDay = (s: string): number | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d.getTime();
};

export default function Activity() {
  const { colors } = useTheme();
  const eerc = useEerc();
  const me = eerc.address?.toLowerCase();
  const activity = useActivity(me);
  const requests = useRequests(me);
  const [filter, setFilter] = useState(0);
  const [unlocking, setUnlocking] = useState(false);
  const [range, setRange] = useState<RangeId>("all");
  const [showDate, setShowDate] = useState(false);
  const [custom, setCustom] = useState<{ from: number; to: number } | null>(null);
  const [fromStr, setFromStr] = useState("");
  const [toStr, setToStr] = useState("");
  const isRequests = FILTERS[filter] === "Requests";

  const now = Date.now();
  const inRange = (iso: string): boolean => {
    const t = new Date(iso).getTime();
    switch (range) {
      case "today": {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return t >= d.getTime();
      }
      case "24h":
        return t >= now - DAY;
      case "week":
        return t >= now - 7 * DAY;
      case "month":
        return t >= now - 30 * DAY;
      case "custom":
        return custom ? t >= custom.from && t <= custom.to : true;
      default:
        return true;
    }
  };

  const applyCustom = () => {
    const f = parseDay(fromStr);
    const t = parseDay(toStr);
    if (f == null && t == null) return;
    setCustom({ from: f ?? 0, to: t != null ? t + DAY - 1 : now });
    setRange("custom");
    setShowDate(false);
  };

  const items = isRequests
    ? []
    : (activity.data ?? [])
        .filter((p) => {
          if (FILTERS[filter] === "Sent") return p.kind === "sent";
          if (FILTERS[filter] === "Received") return p.kind === "received";
          if (FILTERS[filter] === "Added/Out") {
            return p.kind === "deposit" || p.kind === "withdraw";
          }
          return true;
        })
        .filter((p) => inRange(p.created_at));
  const groups = groupByDate(items);

  // The "Requests" filter lists your money requests (incoming + outgoing), newest
  // first — actionable via RequestRow (Pay / Decline / Cancel).
  const requestRows = [
    ...(requests.data?.incoming ?? []).map((r) => ({
      key: `in:${r.id}`,
      item: r,
      direction: "incoming" as const,
    })),
    ...(requests.data?.outgoing ?? []).map((r) => ({
      key: `out:${r.id}`,
      item: r,
      direction: "outgoing" as const,
    })),
  ]
    .filter((x) => inRange(x.item.created_at))
    .sort((a, b) => (a.item.created_at < b.item.created_at ? 1 : -1));

  const unlock = async () => {
    if (unlocking) return;
    setUnlocking(true);
    try {
      await eerc.enableDecryption();
    } catch {
      // Errors surface via the ErrorBoundary; keep the list usable meanwhile.
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.titleRow}>
        <Text style={[typeScale.screenTitle, { color: colors.ink }]}>Activity</Text>
        <Pressable
          onPress={() => setShowDate((s) => !s)}
          style={[styles.datePill, { backgroundColor: colors.chip }]}
        >
          <Text style={[styles.datePillText, { color: colors.ink }]}>
            🗓  {RANGE_LABEL[range]}  ▾
          </Text>
        </Pressable>
      </View>

      {showDate ? (
        <View style={styles.datePanel}>
          <View style={styles.segment}>
            {RANGES.map((r) => {
              const on = r.id === range;
              return (
                <Pressable
                  key={r.id}
                  onPress={() => {
                    setRange(r.id);
                    if (r.id !== "custom") setShowDate(false);
                  }}
                  style={[styles.seg, { backgroundColor: on ? colors.ink : colors.chip }]}
                >
                  <Text style={[styles.segText, { color: on ? colors.bg : colors.sub }]}>
                    {r.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {range === "custom" ? (
            <View style={styles.customRow}>
              <TextInput
                value={fromStr}
                onChangeText={setFromStr}
                placeholder="From  YYYY-MM-DD"
                placeholderTextColor={colors.sub}
                autoCapitalize="none"
                style={[styles.dateInput, { backgroundColor: colors.card, color: colors.ink, borderColor: colors.line }]}
              />
              <TextInput
                value={toStr}
                onChangeText={setToStr}
                placeholder="To  YYYY-MM-DD"
                placeholderTextColor={colors.sub}
                autoCapitalize="none"
                style={[styles.dateInput, { backgroundColor: colors.card, color: colors.ink, borderColor: colors.line }]}
              />
              <Pressable onPress={applyCustom} style={[styles.apply, { backgroundColor: colors.actBlue }]}>
                <Text style={styles.applyText}>Apply</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.segment}>
        {FILTERS.map((f, i) => {
          const on = i === filter;
          return (
            <Pressable
              key={f}
              onPress={() => setFilter(i)}
              style={[styles.seg, { backgroundColor: on ? colors.ink : colors.chip }]}
            >
              <Text style={[styles.segText, { color: on ? colors.bg : colors.sub }]}>
                {f}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {eerc.isRegistered && !eerc.isDecryptionKeySet ? (
        <View style={[styles.unlock, { backgroundColor: colors.card }]}>
          <Text style={[styles.unlockText, { color: colors.sub }]}>
            Unlock to reveal your amounts — one signature, never leaves this device.
          </Text>
          <Button
            label={unlocking ? "Unlocking…" : "Show amounts"}
            variant="primary"
            onPress={unlock}
          />
        </View>
      ) : null}

      {isRequests ? (
        <FlatList
          data={requestRows}
          keyExtractor={(x) => x.key}
          renderItem={({ item }) => (
            <RequestRow item={item.item} direction={item.direction} />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={requests.isFetching}
              onRefresh={requests.refetch}
              tintColor={colors.actBlue}
            />
          }
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.sub }]}>
              {requests.isLoading ? "Loading…" : "No requests in this range."}
            </Text>
          }
        />
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(g) => g.label}
          renderItem={({ item: group }) => (
            <View style={styles.group}>
              <Text style={[styles.groupLabel, { color: colors.sub }]}>
                {group.label}
              </Text>
              <View style={[styles.card, { backgroundColor: colors.card }]}>
                {group.items.map((p, i) => (
                  <Pressable
                    key={p.tx_hash}
                    onPress={() =>
                      router.push({
                        pathname: "/receipt",
                        params: {
                          txHash: p.tx_hash,
                          kind: p.kind,
                          name:
                            p.kind === "deposit" || p.kind === "withdraw"
                              ? ""
                              : displayName(p.counterparty, p.counterpartyAddress ?? ""),
                          address: p.counterpartyAddress ?? "",
                          caption: p.caption ?? "",
                          createdAt: p.created_at,
                        },
                      })
                    }
                    style={
                      i ? { borderTopWidth: 1, borderTopColor: colors.line } : undefined
                    }
                  >
                    <ActivityRow item={p} />
                  </Pressable>
                ))}
              </View>
            </View>
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={activity.isFetching}
              onRefresh={activity.refetch}
              tintColor={colors.actBlue}
            />
          }
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.sub }]}>
              {activity.isLoading ? "Loading…" : "No payments in this range."}
            </Text>
          }
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  datePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  datePillText: { fontFamily: fonts.ui, fontSize: 13, fontWeight: "600" },
  datePanel: { marginTop: spacing.md, gap: spacing.sm },
  customRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
  dateInput: {
    fontFamily: fonts.mono,
    fontSize: 13,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.input,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: 130,
  },
  apply: { paddingHorizontal: 18, paddingVertical: 11, borderRadius: radius.button },
  applyText: { fontFamily: fonts.ui, fontSize: 13.5, fontWeight: "700", color: "#fff" },
  segment: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginVertical: spacing.md },
  seg: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: radius.pill },
  segText: { fontFamily: fonts.ui, fontSize: 13, fontWeight: "600" },
  unlock: {
    borderRadius: radius.card,
    padding: 16,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  unlockText: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 19 },
  group: { marginBottom: spacing.sm },
  groupLabel: {
    fontFamily: fonts.ui,
    fontSize: 12.5,
    fontWeight: "600",
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  card: { borderRadius: radius.card, paddingHorizontal: 16 },
  list: { paddingBottom: spacing.xl },
  empty: {
    fontFamily: fonts.ui,
    fontSize: 14,
    textAlign: "center",
    marginTop: spacing.xl,
  },
});
