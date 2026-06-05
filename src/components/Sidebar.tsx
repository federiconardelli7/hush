import Feather from "@expo/vector-icons/Feather";
import { router, usePathname } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Avatar } from "@/design-system/primitives/Avatar";
import { useTheme } from "@/design-system/theme";
import { layout, shadow } from "@/design-system/tokens";
import { fonts } from "@/design-system/typography";
import { useEerc } from "@/features/eerc/useEerc";
import { useProfile } from "@/features/profile/useProfile";

const NAV = [
  { label: "Home", icon: "home", path: "/home" },
  { label: "Activity", icon: "activity", path: "/activity" },
  { label: "Feed", icon: "globe", path: "/feed" },
  { label: "People", icon: "users", path: "/contacts" },
] as const;

// Desktop-only left sidebar (shown ≥ layout.wide; mobile keeps the bottom tab bar).
// Mirrors design_handoff_hush/hifi-web.jsx: brand, nav, a Pay-or-request CTA, and a
// profile card pinned to the bottom. Navigates via expo-router so it can reach People
// (/contacts) and the profile (/me), which aren't bottom-tab destinations.
export function Sidebar() {
  const { colors } = useTheme();
  const pathname = usePathname();
  const { address } = useEerc();
  const profile = useProfile(address ?? null);

  return (
    <View
      style={[
        styles.bar,
        { width: layout.sidebar, backgroundColor: colors.card, borderRightColor: colors.line },
      ]}
    >
      <View style={styles.brand}>
        <Image source={require("../../assets/avalanche-logo.png")} style={styles.mark} resizeMode="contain" />
        <Text style={[styles.word, { color: colors.ink }]}>Hush</Text>
      </View>

      <View style={styles.nav}>
        {NAV.map((item) => {
          const active = pathname === item.path;
          return (
            <Pressable
              key={item.path}
              onPress={() => router.push(item.path)}
              style={[styles.row, active ? { backgroundColor: colors.chip } : null]}
            >
              <Feather
                name={item.icon}
                size={20}
                color={active ? colors.actBlue : colors.sub}
                style={styles.rowIcon}
              />
              <Text
                style={[
                  styles.rowLabel,
                  { color: active ? colors.ink : colors.sub, fontWeight: active ? "700" : "500" },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={() => router.push("/pay")}
        style={[styles.cta, { backgroundColor: colors.actBlue }, shadow.buttonBlue]}
      >
        <Feather name="plus" size={18} color="#fff" />
        <Text style={styles.ctaText}>Pay or request</Text>
      </Pressable>

      <View style={styles.spacer} />

      <Pressable onPress={() => router.push("/me")} style={[styles.profile, { borderColor: colors.line }]}>
        <Avatar name={profile.data?.display_name ?? "Hush"} size={34} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.pName, { color: colors.ink }]} numberOfLines={1}>
            {profile.data?.display_name ?? "Your profile"}
          </Text>
          {profile.data ? (
            <Text style={[styles.pHandle, { color: colors.sub }]} numberOfLines={1}>
              @{profile.data.username}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: "100%", borderRightWidth: 1, paddingVertical: 20, paddingHorizontal: 16 },
  brand: { flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 8, paddingBottom: 18 },
  mark: { width: 28, height: 28 },
  word: { fontFamily: fonts.ui, fontSize: 20, fontWeight: "800", letterSpacing: -0.4 },
  nav: { gap: 3 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, paddingHorizontal: 12, borderRadius: 13 },
  rowIcon: { width: 22, textAlign: "center" },
  rowLabel: { fontFamily: fonts.ui, fontSize: 14.5 },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 14,
  },
  ctaText: { fontFamily: fonts.ui, fontSize: 14.5, fontWeight: "700", color: "#fff" },
  spacer: { flex: 1 },
  profile: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 14, borderWidth: 1 },
  pName: { fontFamily: fonts.ui, fontSize: 13.5, fontWeight: "700" },
  pHandle: { fontFamily: fonts.mono, fontSize: 11, marginTop: 1 },
});
