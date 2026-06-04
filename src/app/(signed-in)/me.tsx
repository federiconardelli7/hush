import { usePrivy } from "@privy-io/react-auth";
import { router } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Avatar } from "@/design-system/primitives/Avatar";
import { Button } from "@/design-system/primitives/Button";
import { ScreenContainer } from "@/design-system/primitives/ScreenContainer";
import { useTheme } from "@/design-system/theme";
import { radius, spacing } from "@/design-system/tokens";
import { fonts, typeScale } from "@/design-system/typography";
import { useEerc } from "@/features/eerc/useEerc";
import { useProfile } from "@/features/profile/useProfile";

function Row({
  icon,
  label,
  sub,
  right,
  onPress,
  first,
}: {
  icon: string;
  label: string;
  sub?: string;
  right?: ReactNode;
  onPress?: () => void;
  first?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, first ? null : { borderTopWidth: 1, borderTopColor: colors.line }]}
    >
      <Text style={styles.rowIcon}>{icon}</Text>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.rowLabel, { color: colors.ink }]}>{label}</Text>
        {sub ? (
          <Text style={[styles.rowSub, { color: colors.sub }]} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
      {right ?? <Text style={[styles.chev, { color: colors.sub }]}>›</Text>}
    </Pressable>
  );
}

export default function Me() {
  const { colors, isDark, toggle } = useTheme();
  const { logout } = usePrivy();
  const { address, supabaseStatus, supabaseBoundWallet, supabaseError } = useEerc();
  const profile = useProfile(address ?? null);

  const bound =
    supabaseStatus === "ready" && supabaseBoundWallet === address?.toLowerCase();
  const dbLine =
    supabaseStatus === "signing"
      ? "Binding…"
      : supabaseStatus === "error"
        ? (supabaseError ?? "Binding failed")
        : bound
          ? `Database bound ✓ · RLS sees ${supabaseBoundWallet?.slice(0, 10)}…`
          : "Database: connecting…";

  return (
    <ScreenContainer>
      <Text style={[typeScale.screenTitle, styles.title, { color: colors.ink }]}>
        Me
      </Text>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.profileRow}>
          <Avatar name={profile.data?.display_name ?? "Hush"} size={56} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.pName, { color: colors.ink }]} numberOfLines={1}>
              {profile.data?.display_name ?? "Your profile"}
            </Text>
            {profile.data ? (
              <Text style={[styles.pHandle, { color: colors.sub }]}>
                @{profile.data.username}
              </Text>
            ) : null}
            <Text style={[styles.pAddr, { color: colors.sub }]} numberOfLines={1} selectable>
              {address ?? "Preparing…"}
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Row
            icon="👤"
            label="Edit profile"
            onPress={() => router.push("/edit-profile")}
            first
          />
          <Row
            icon="🔒"
            label="Privacy & security"
            onPress={() => router.push("/privacy")}
          />
          <Row icon="👥" label="Contacts" onPress={() => router.push("/contacts")} />
          <Row
            icon={isDark ? "🌙" : "☀️"}
            label="Appearance"
            sub={isDark ? "Dark" : "Light"}
            onPress={toggle}
            right={
              <Text style={[styles.chev, { color: colors.actBlue }]}>
                {isDark ? "Light" : "Dark"}
              </Text>
            }
          />
        </View>

        <Text
          style={[
            styles.dbLine,
            { color: supabaseStatus === "error" ? colors.avRed : bound ? colors.positive : colors.sub },
          ]}
        >
          {dbLine}
        </Text>

        <Button
          label="Sign out"
          variant="ghost"
          onPress={() => {
            void logout();
          }}
          style={styles.signout}
        />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: spacing.md },
  scroll: { paddingBottom: spacing.xl },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  pName: { fontFamily: fonts.ui, fontSize: 18, fontWeight: "700" },
  pHandle: { fontFamily: fonts.mono, fontSize: 13, marginTop: 1 },
  pAddr: { fontFamily: fonts.mono, fontSize: 11.5, marginTop: 4 },
  card: { borderRadius: radius.card, paddingHorizontal: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 13, paddingVertical: 14 },
  rowIcon: { fontSize: 18, width: 22, textAlign: "center" },
  rowLabel: { fontFamily: fonts.ui, fontSize: 15, fontWeight: "500" },
  rowSub: { fontFamily: fonts.ui, fontSize: 12, marginTop: 1 },
  chev: { fontFamily: fonts.ui, fontSize: 16, fontWeight: "600" },
  dbLine: { fontFamily: fonts.ui, fontSize: 11.5, marginTop: spacing.lg, textAlign: "center" },
  signout: { marginTop: spacing.md },
});
