import { usePrivy } from "@privy-io/react-auth";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Avatar } from "@/design-system/primitives/Avatar";
import { Button } from "@/design-system/primitives/Button";
import { ScreenContainer } from "@/design-system/primitives/ScreenContainer";
import { useTheme } from "@/design-system/theme";
import { radius, spacing } from "@/design-system/tokens";
import { fonts, typeScale } from "@/design-system/typography";
import { useEerc } from "@/features/eerc/useEerc";
import { useProfile } from "@/features/profile/useProfile";

export default function Me() {
  const { colors, isDark, toggle } = useTheme();
  const { logout } = usePrivy();
  const { address, supabaseStatus, supabaseBoundWallet, supabaseError } = useEerc();
  const profile = useProfile(address ?? null);

  const bound =
    supabaseStatus === "ready" &&
    supabaseBoundWallet === address?.toLowerCase();
  const supabaseLine =
    supabaseStatus === "signing"
      ? "Binding…"
      : supabaseStatus === "error"
        ? (supabaseError ?? "Binding failed")
        : supabaseStatus === "ready"
          ? bound
            ? `Bound ✓ — RLS sees ${supabaseBoundWallet?.slice(0, 10)}…`
            : `Bound, but RLS sees ${supabaseBoundWallet ?? "nothing"}`
          : "—";

  return (
    <ScreenContainer>
      <Text style={[typeScale.screenTitle, styles.title, { color: colors.ink }]}>
        Me
      </Text>

      {profile.data ? (
        <View style={styles.profileRow}>
          <Avatar name={profile.data.display_name} size={52} />
          <View>
            <Text style={[styles.pName, { color: colors.ink }]}>
              {profile.data.display_name}
            </Text>
            <Text style={[styles.pHandle, { color: colors.sub }]}>
              @{profile.data.username}
            </Text>
          </View>
        </View>
      ) : null}

      <Text style={[styles.label, { color: colors.sub }]}>Your address</Text>
      <View
        style={[
          styles.addrBox,
          { backgroundColor: colors.card, borderColor: colors.line },
        ]}
      >
        <Text style={[styles.addr, { color: colors.ink }]} selectable>
          {address ?? "Preparing…"}
        </Text>
      </View>

      <Text style={[styles.label, styles.spacer, { color: colors.sub }]}>
        Database (Supabase)
      </Text>
      <Text
        style={[
          styles.addr,
          {
            color:
              supabaseStatus === "error"
                ? colors.avRed
                : bound
                  ? colors.positive
                  : colors.sub,
          },
        ]}
      >
        {supabaseLine}
      </Text>

      <View style={styles.actions}>
        <Button
          label="Contacts"
          variant="secondary"
          onPress={() => router.push("/contacts")}
        />
        <Button
          label={isDark ? "Switch to light" : "Switch to dark"}
          variant="secondary"
          onPress={toggle}
        />
        <Button
          label="Sign out"
          variant="ghost"
          onPress={() => {
            void logout();
          }}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: spacing.lg },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  pName: { fontFamily: fonts.ui, fontSize: 18, fontWeight: "700" },
  pHandle: { fontFamily: fonts.mono, fontSize: 13 },
  label: { fontFamily: fonts.ui, fontSize: 12.5, fontWeight: "600", marginBottom: spacing.xs },
  spacer: { marginTop: spacing.lg },
  addrBox: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.input,
    borderWidth: 1,
  },
  addr: { fontFamily: fonts.mono, fontSize: 13 },
  actions: { gap: spacing.sm, marginTop: spacing.xl },
});
