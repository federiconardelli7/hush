import { router } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/design-system/theme";
import { fonts } from "@/design-system/typography";
import { useEerc } from "@/features/eerc/useEerc";
import { useReadIds } from "@/features/notifications/seen";
import { isUnreadKind, useNotifications } from "@/features/notifications/useNotifications";

// Desktop per-screen top bar: page title + optional `head` slot + a bell (with unread
// dot) + settings gear. Bell/unread mirrors the Home logic so the badge stays consistent.
export function WebTopBar({ title, head }: { title: string; head?: ReactNode }) {
  const { colors } = useTheme();
  const { address } = useEerc();
  const me = address?.toLowerCase();
  const notifications = useNotifications(me);
  const readIds = useReadIds(me);
  const unread = (notifications.data ?? []).filter(
    (n) => isUnreadKind(n.kind) && !readIds.has(n.id),
  ).length;

  return (
    <View style={[styles.bar, { borderBottomColor: colors.line }]}>
      <Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
      <View style={styles.right}>
        {head}
        <Pressable
          onPress={() => router.push("/notifications")}
          style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.line }]}
        >
          <Text style={styles.icon}>🔔</Text>
          {unread > 0 ? (
            <View style={[styles.dot, { backgroundColor: colors.actBlue, borderColor: colors.card }]} />
          ) : null}
        </Pressable>
        <Pressable
          onPress={() => router.push("/me")}
          style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.line }]}
        >
          <Text style={styles.icon}>⚙️</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 30,
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  title: { fontFamily: fonts.ui, fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  right: { marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 10 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  icon: { fontSize: 18 },
  dot: { position: "absolute", top: 8, right: 8, width: 8, height: 8, borderRadius: 4, borderWidth: 2 },
});
