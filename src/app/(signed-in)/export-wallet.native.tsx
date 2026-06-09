import Feather from "@expo/vector-icons/Feather";
import { router } from "expo-router";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { DesktopScreen } from "@/components/DesktopScreen";
import { Button } from "@/design-system/primitives/Button";
import { ScreenContainer } from "@/design-system/primitives/ScreenContainer";
import { useTheme } from "@/design-system/theme";
import { radius, spacing } from "@/design-system/tokens";
import { fonts, typeScale } from "@/design-system/typography";
import { useIsWide } from "@/design-system/useResponsive";

const WEB_APP_URL = "https://hush-rho-two.vercel.app";

const WARNINGS = [
  "Anyone with this key controls the wallet and everything in it — there is no undo.",
  "Never share it, and never paste it into a site or app you don't fully trust.",
  "Hush and Privy can't see or recover it. If you lose it, it's gone for good.",
];

// Native counterpart of export-wallet.tsx (web). Privy's `exportWallet` requires a
// secure browser context and is only available in the React (web) SDK — on mobile,
// key export must run on a hosted web page (Privy `recipes/mobile-key-export`). For
// now Hush points you to the web app, which already supports export (D-38); an
// in-app hosted-WebView export flow is a tracked follow-up. No Privy import here, so
// the web SDK never enters the native bundle.
export default function ExportWalletNative() {
  const { colors } = useTheme();
  const isWide = useIsWide();

  const openWebApp = () => {
    void Linking.openURL(`${WEB_APP_URL}/me`).catch(() => {});
  };

  const body = (
    <View style={styles.wrap}>
      <View style={[styles.iconWrap, { backgroundColor: colors.chip }]}>
        <Feather name="key" size={26} color={colors.ink} />
      </View>
      <Text style={[typeScale.screenTitle, styles.title, { color: colors.ink }]}>
        Export private key
      </Text>
      <Text style={[styles.lead, { color: colors.sub }]}>
        Revealing your private key needs a secure browser, so on mobile it's done in
        the Hush web app. Open it on this device, sign in with the same account, then
        go to Settings → Export private key.
      </Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.line }]}>
        {WARNINGS.map((w) => (
          <View key={w} style={styles.warnRow}>
            <Feather name="alert-triangle" size={15} color={colors.avRed} />
            <Text style={[styles.warnText, { color: colors.sub }]}>{w}</Text>
          </View>
        ))}
      </View>
      <Button
        label="Open the Hush web app"
        variant="primary"
        onPress={openWebApp}
        style={styles.cta}
      />
      <Text style={[styles.footnote, { color: colors.sub }]}>
        The key is shown in a secure window — Hush never sees it.
      </Text>
    </View>
  );

  if (isWide) {
    return (
      <DesktopScreen title="Export private key" back center maxWidth={460}>
        {body}
      </DesktopScreen>
    );
  }
  return (
    <ScreenContainer maxWidth={460}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.iconBtn, { backgroundColor: colors.chip }]}
        >
          <Text style={[styles.chev, { color: colors.ink }]}>‹</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.ink }]}>Security</Text>
        <View style={styles.iconBtn} />
      </View>
      {body}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm },
  iconBtn: { width: 40, height: 40, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  chev: { fontSize: 26, fontWeight: "700", lineHeight: 28 },
  headerTitle: { flex: 1, textAlign: "center", fontFamily: fonts.ui, fontSize: 18, fontWeight: "700" },
  wrap: { flex: 1, alignItems: "center", gap: spacing.md, paddingTop: spacing.lg },
  iconWrap: { width: 56, height: 56, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  title: { textAlign: "center" },
  lead: { fontFamily: fonts.ui, fontSize: 14, textAlign: "center", maxWidth: 340, lineHeight: 20 },
  card: {
    alignSelf: "stretch",
    borderRadius: radius.card,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  warnRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  warnText: { flex: 1, fontFamily: fonts.ui, fontSize: 13, lineHeight: 18 },
  cta: { alignSelf: "stretch", marginTop: spacing.md },
  footnote: { fontFamily: fonts.ui, fontSize: 12, textAlign: "center", maxWidth: 320 },
});
