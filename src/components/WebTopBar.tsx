import Feather from "@expo/vector-icons/Feather";
import { router } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/design-system/theme";
import { fonts } from "@/design-system/typography";
import { useEerc } from "@/features/eerc/useEerc";
import { useReadIds } from "@/features/notifications/seen";
import { isUnreadKind, useNotifications } from "@/features/notifications/useNotifications";

// Desktop per-screen top bar: page title + optional `head` slot + a bell (with unread
// dot) + a one-click light/dark toggle (Settings is reachable via the sidebar profile
// card, so the gear was redundant). Bell/unread mirrors the Home logic.
export function WebTopBar({
  title,
  head,
  back,
}: {
  title: string;
  head?: ReactNode;
  back?: boolean;
}) {
  const { colors, isDark, toggle } = useTheme();
  const { address } = useEerc();
  const me = address?.toLowerCase();
  const notifications = useNotifications(me);
  const readIds = useReadIds(me);
  const unread = (notifications.data ?? []).filter(
    (n) => isUnreadKind(n.kind) && !readIds.has(n.id),
  ).length;

  return (
    <View style={[styles.bar, { borderBottomColor: colors.line }]}>
      {back ? (
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.line }]}
        >
          <Feather name="chevron-left" size={20} color={colors.ink} />
        </Pressable>
      ) : null}
      <Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
      <View style={styles.right}>
        {head}
        <Pressable
          onPress={() => router.push("/notifications")}
          style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.line }]}
        >
          <Feather name="bell" size={18} color={colors.ink} />
          {unread > 0 ? (
            <View style={[styles.dot, { backgroundColor: colors.actBlue, borderColor: colors.card }]} />
          ) : null}
        </Pressable>
        <Pressable
          onPress={toggle}
          style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.line }]}
        >
          <Feather name={isDark ? "sun" : "moon"} size={18} color={colors.ink} />
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
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  title: { fontFamily: fonts.ui, fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  right: { marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 10 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  dot: { position: "absolute", top: 8, right: 8, width: 8, height: 8, borderRadius: 4, borderWidth: 2 },
});
