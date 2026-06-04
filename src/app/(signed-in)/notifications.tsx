import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text } from "react-native";
import { NotificationRow } from "@/components/NotificationRow";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ScreenContainer } from "@/design-system/primitives/ScreenContainer";
import { useTheme } from "@/design-system/theme";
import { spacing } from "@/design-system/tokens";
import { fonts } from "@/design-system/typography";
import { useEerc } from "@/features/eerc/useEerc";
import { getLastSeen, markSeen } from "@/features/notifications/seen";
import { useNotifications } from "@/features/notifications/useNotifications";

export default function Notifications() {
  const { colors } = useTheme();
  const { address } = useEerc();
  const me = address?.toLowerCase();
  const notifications = useNotifications(me);

  // Freeze the seen-at-open timestamp so this view keeps its "new" highlights, but
  // mark seen on open so the Home bell badge clears.
  const [seenAtOpen] = useState(() => (me ? getLastSeen(me) : 0));
  useEffect(() => {
    if (me) markSeen(me);
  }, [me]);

  const items = notifications.data ?? [];

  return (
    <ScreenContainer>
      <ScreenHeader title="Notifications" />
      <FlatList
        data={items}
        keyExtractor={(n) => `${n.kind}:${n.id}`}
        renderItem={({ item }) => (
          <NotificationRow
            item={item}
            unread={new Date(item.created_at).getTime() > seenAtOpen}
          />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.sub }]}>
            {notifications.isLoading
              ? "Loading…"
              : "Nothing yet. Payments and requests will show up here."}
          </Text>
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { paddingTop: spacing.sm, paddingBottom: spacing.xl },
  empty: {
    fontFamily: fonts.ui,
    fontSize: 14,
    textAlign: "center",
    marginTop: spacing.xl,
    lineHeight: 21,
  },
});
