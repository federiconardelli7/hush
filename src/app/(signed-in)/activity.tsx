import { router } from "expo-router";
import { useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
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

export default function Activity() {
  const { colors } = useTheme();
  const eerc = useEerc();
  const me = eerc.address?.toLowerCase();
  const activity = useActivity(me);
  const requests = useRequests(me);
  const [filter, setFilter] = useState(0);
  const [unlocking, setUnlocking] = useState(false);
  const isRequests = FILTERS[filter] === "Requests";

  const items = isRequests
    ? []
    : (activity.data ?? []).filter((p) => {
        if (FILTERS[filter] === "Sent") return p.kind === "sent";
        if (FILTERS[filter] === "Received") return p.kind === "received";
        if (FILTERS[filter] === "Added/Out") {
          return p.kind === "deposit" || p.kind === "withdraw";
        }
        return true;
      });
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
  ].sort((a, b) => (a.item.created_at < b.item.created_at ? 1 : -1));

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
      <Text style={[typeScale.screenTitle, { color: colors.ink }]}>Activity</Text>

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
              {requests.isLoading ? "Loading…" : "No requests yet."}
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
              {activity.isLoading ? "Loading…" : "No payments yet."}
            </Text>
          }
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
