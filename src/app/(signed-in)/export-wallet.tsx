import Feather from "@expo/vector-icons/Feather";
import { useExportWallet, usePrivy } from "@privy-io/react-auth";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { DesktopScreen } from "@/components/DesktopScreen";
import { Button } from "@/design-system/primitives/Button";
import { ScreenContainer } from "@/design-system/primitives/ScreenContainer";
import { useTheme } from "@/design-system/theme";
import { radius, spacing } from "@/design-system/tokens";
import { fonts, typeScale } from "@/design-system/typography";
import { useIsWide } from "@/design-system/useResponsive";

const WARNINGS = [
  "Anyone with this key controls the wallet and everything in it — there is no undo.",
  "Never share it, and never paste it into a site or app you don't fully trust.",
  "Hush and Privy can't see or recover it. If you lose it, it's gone for good.",
  "Import it into a wallet like MetaMask to use your funds outside Hush.",
];

// Settings → reveal the embedded wallet's private key for self-custody. The key is
// assembled and shown inside Privy's secure modal on a separate origin — Hush never
// sees it (D-38). Gated on an authenticated user with an embedded wallet.
export default function ExportWallet() {
  const { colors } = useTheme();
  const isWide = useIsWide();
  const { ready, authenticated, user } = usePrivy();
  const { exportWallet } = useExportWallet();

  const hasEmbeddedWallet = Boolean(
    user?.linkedAccounts?.find(
      (a) =>
        a.type === "wallet" &&
        a.walletClientType === "privy" &&
        a.chainType === "ethereum",
    ),
  );
  const canExport = ready && authenticated && hasEmbeddedWallet;

  // Open Privy's secure export modal. We deliberately do NOT track a loading state:
  // exportWallet's promise doesn't reliably settle when the user dismisses the modal,
  // and this screen stays mounted (tab route), so a promise-tied "Opening…" state would
  // get stuck on the button and block re-exporting. Firing on each tap re-opens it cleanly.
  const onExport = () => {
    if (!canExport) return;
    void exportWallet().catch(() => {});
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
        This reveals the private key for your Hush wallet so you can use it in another wallet app.
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
        label="Reveal private key"
        variant="primary"
        onPress={onExport}
        style={styles.cta}
      />
      <Text style={[styles.footnote, { color: colors.sub }]}>
        The key is shown in a secure Privy window — Hush never sees it.
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
