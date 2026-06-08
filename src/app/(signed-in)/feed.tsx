import { router } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { DesktopScreen } from "@/components/DesktopScreen";
import { FeedRow } from "@/components/FeedRow";
import { EmptyState } from "@/design-system/primitives/EmptyState";
import { ScreenContainer } from "@/design-system/primitives/ScreenContainer";
import { SkeletonList } from "@/design-system/primitives/Skeleton";
import { useTheme } from "@/design-system/theme";
import { radius, spacing } from "@/design-system/tokens";
import { useIsWide } from "@/design-system/useResponsive";
import { fonts, typeScale } from "@/design-system/typography";
import { useEerc } from "@/features/eerc/useEerc";
import type { FeedItem } from "@/features/payments/useFeed";
import { useFeed } from "@/features/payments/useFeed";
import { useFeedSocial } from "@/features/social/useFeedSocial";
import { displayName } from "@/lib/identity";

// Order from least → most private: Public (the engaged, default view) first, then
// Friends, then You.
const SCOPES = ["Public", "Friends", "You"] as const;

// Scope-aware empty-state copy (reads naturally per filter, not a raw label).
const EMPTY_BY_SCOPE: Record<(typeof SCOPES)[number], string> = {
  Friends: "No payments from friends yet.",
  Public: "No public payments yet.",
  You: "No payments involving you yet.",
};

export default function Feed() {
  const { colors } = useTheme();
  const isWide = useIsWide();
  const { address } = useEerc();
  const feed = useFeed();
  const [scope, setScope] = useState(0);
  const me = address?.toLowerCase();

  // Batched like/comment tallies for every loaded payment (filtering is display-only,
  // so social is fetched for the full set). RLS keeps it to visible payments.
  const txHashes = (feed.data ?? []).map((p) => p.tx_hash);
  const feedSocial = useFeedSocial(txHashes, me);
  const socialMap = feedSocial.data ?? {};

  const items = (feed.data ?? []).filter((p) => {
    if (SCOPES[scope] === "Public") return p.audience === "public";
    if (SCOPES[scope] === "You") {
      return Boolean(me) && (p.sender_address === me || p.receiver_address === me);
    }
    return p.audience === "friends";
  });

  // One row renderer shared by the mobile FlatList and the desktop column. Every row
  // carries the like/comment action bar and opens the public thread; rows the signed-in
  // user is party to keep their tap → receipt (amount + proof), others tap → thread.
  const renderRow = (item: FeedItem) => {
    const mine = item.sender_address === me || item.receiver_address === me;
    const openThread = () =>
      router.push({
        pathname: "/payment-thread",
        params: {
          txHash: item.tx_hash,
          senderName: displayName(item.sender, item.sender_address),
          senderAddress: item.sender_address,
          receiverName: displayName(item.receiver, item.receiver_address),
          receiverAddress: item.receiver_address,
          caption: item.caption ?? "",
          createdAt: item.created_at,
        },
      });
    const row = (
      <FeedRow
        item={item}
        social={socialMap[item.tx_hash]}
        me={me}
        onOpenThread={openThread}
      />
    );
    if (!mine) {
      return <Pressable onPress={openThread}>{row}</Pressable>;
    }
    const kind = item.sender_address === me ? "sent" : "received";
    const counterparty = kind === "sent" ? item.receiver : item.sender;
    const counterpartyAddress =
      kind === "sent" ? item.receiver_address : item.sender_address;
    return (
      <Pressable
        onPress={() =>
          router.push({
            pathname: "/receipt",
            params: {
              txHash: item.tx_hash,
              kind,
              name: displayName(counterparty, counterpartyAddress),
              address: counterpartyAddress,
              caption: item.caption ?? "",
              createdAt: item.created_at,
            },
          })
        }
      >
        {row}
      </Pressable>
    );
  };

  const segment = (
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
  );

  // Desktop: the page title lives in DesktopScreen's bar (alongside the bell + settings);
  // the segmented control is the first item in the centered 600px column, above the rows
  // (DesktopScreen already scrolls, so no nested FlatList — mirrors home.tsx).
  if (isWide) {
    return (
      <DesktopScreen title="Feed" maxWidth={600}>
        {segment}
        {items.length === 0 ? (
          feed.isLoading ? (
            <SkeletonList />
          ) : (
            <EmptyState icon="globe" title={EMPTY_BY_SCOPE[SCOPES[scope]]} />
          )
        ) : (
          items.map((item) => <View key={item.tx_hash}>{renderRow(item)}</View>)
        )}
      </DesktopScreen>
    );
  }

  return (
    <ScreenContainer>
      <Text style={[typeScale.screenTitle, { color: colors.ink }]}>Feed</Text>

      {segment}

      <FlatList
        data={items}
        keyExtractor={(p) => p.tx_hash}
        renderItem={({ item }) => renderRow(item)}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={feed.isFetching}
            onRefresh={feed.refetch}
            tintColor={colors.actBlue}
          />
        }
        ListEmptyComponent={
          feed.isLoading ? (
            <SkeletonList />
          ) : (
            <EmptyState icon="globe" title={EMPTY_BY_SCOPE[SCOPES[scope]]} />
          )
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
});
