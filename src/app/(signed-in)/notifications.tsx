import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { NotificationRow } from "@/components/NotificationRow";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Button } from "@/design-system/primitives/Button";
import { EmptyState } from "@/design-system/primitives/EmptyState";
import { ScreenContainer } from "@/design-system/primitives/ScreenContainer";
import { SkeletonList } from "@/design-system/primitives/Skeleton";
import { useTheme } from "@/design-system/theme";
import { radius, spacing } from "@/design-system/tokens";
import { fonts } from "@/design-system/typography";
import { useEerc } from "@/features/eerc/useEerc";
import { markRead, useReadIds } from "@/features/notifications/seen";
import {
  isUnreadKind,
  useNotifications,
  type NotificationItem,
} from "@/features/notifications/useNotifications";

export default function Notifications() {
  const { colors } = useTheme();
  const eerc = useEerc();
  const me = eerc.address?.toLowerCase();
  const notifications = useNotifications(me);
  const readIds = useReadIds(me);
  const [unlocking, setUnlocking] = useState(false);

  const items = notifications.data ?? [];
  const isUnread = (n: NotificationItem) => isUnreadKind(n.kind) && !readIds.has(n.id);
  const hasUnread = items.some(isUnread);
  const lockedAmounts =
    eerc.isRegistered && !eerc.isDecryptionKeySet && items.some((i) => i.kind === "request");

  // Unread persists until you tap a row or "Mark all read" — a standard inbox (no
  // auto-clear, since router.push keeps this screen mounted and that hid the button).
  const markAllRead = () => markRead(me, items.map((i) => i.id));

  const unlock = async () => {
    if (unlocking) return;
    setUnlocking(true);
    try {
      await eerc.enableDecryption();
    } catch {
      // surfaced by the ErrorBoundary
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <ScreenContainer>
      <ScreenHeader
        title="Notifications"
        right={
          hasUnread ? (
            <Pressable onPress={markAllRead}>
              <Text style={[styles.markAll, { color: colors.actBlue }]}>Mark all read</Text>
            </Pressable>
          ) : undefined
        }
      />

      {lockedAmounts ? (
        <View style={[styles.unlock, { backgroundColor: colors.card }]}>
          <Text style={[styles.unlockText, { color: colors.sub }]}>
            Unlock to reveal request amounts — one signature, never leaves this device.
          </Text>
          <Button
            label={unlocking ? "Unlocking…" : "Show amounts"}
            variant="primary"
            onPress={unlock}
          />
        </View>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        renderItem={({ item }) => (
          <NotificationRow
            item={item}
            unread={isUnread(item)}
            onRead={() => markRead(me, [item.id])}
          />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          notifications.isLoading ? (
            <SkeletonList />
          ) : (
            <EmptyState
              icon="bell"
              title="Nothing yet"
              subtitle="Payments you receive and requests will show up here."
            />
          )
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  markAll: { fontFamily: fonts.ui, fontSize: 13, fontWeight: "600" },
  unlock: {
    borderRadius: radius.card,
    padding: 16,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  unlockText: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 19 },
  list: { paddingTop: spacing.sm, paddingBottom: spacing.xl },
});
