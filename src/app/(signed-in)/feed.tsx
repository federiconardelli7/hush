import { useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { FeedRow } from "@/components/FeedRow";
import { ScreenContainer } from "@/design-system/primitives/ScreenContainer";
import { useTheme } from "@/design-system/theme";
import { radius, spacing } from "@/design-system/tokens";
import { fonts, typeScale } from "@/design-system/typography";
import { useEerc } from "@/features/eerc/useEerc";
import { useFeed } from "@/features/payments/useFeed";

const SCOPES = ["Friends", "Public", "You"] as const;

export default function Feed() {
  const { colors } = useTheme();
  const { address } = useEerc();
  const feed = useFeed();
  const [scope, setScope] = useState(0);
  const me = address?.toLowerCase();

  const items = (feed.data ?? []).filter((p) => {
    if (SCOPES[scope] === "Public") return p.audience === "public";
    if (SCOPES[scope] === "You") {
      return Boolean(me) && (p.sender_address === me || p.receiver_address === me);
    }
    return p.audience === "friends";
  });

  return (
    <ScreenContainer>
      <Text style={[typeScale.screenTitle, { color: colors.ink }]}>Feed</Text>

      <View style={styles.segment}>
        {SCOPES.map((s, i) => {
          const on = i === scope;
          return (
            <Pressable
              key={s}
              onPress={() => setScope(i)}
              style={[styles.seg, { backgroundColor: on ? colors.ink : colors.chip }]}
            >
              <Text style={[styles.segText, { color: on ? colors.bg : colors.sub }]}>
                {s}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={items}
        keyExtractor={(p) => p.tx_hash}
        renderItem={({ item }) => <FeedRow item={item} />}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={feed.isFetching}
            onRefresh={feed.refetch}
            tintColor={colors.actBlue}
          />
        }
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.sub }]}>
            {feed.isLoading ? "Loading…" : "No payments yet."}
          </Text>
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  segment: { flexDirection: "row", gap: spacing.sm, marginVertical: spacing.md },
  seg: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: radius.pill },
  segText: { fontFamily: fonts.ui, fontSize: 13, fontWeight: "600" },
  list: { paddingBottom: spacing.xl },
  empty: { fontFamily: fonts.ui, fontSize: 14, textAlign: "center", marginTop: spacing.xl },
});
