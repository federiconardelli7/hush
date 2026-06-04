import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { QrCode } from "@/components/QrCode";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Avatar } from "@/design-system/primitives/Avatar";
import { ScreenContainer } from "@/design-system/primitives/ScreenContainer";
import { useTheme } from "@/design-system/theme";
import { radius, spacing } from "@/design-system/tokens";
import { fonts } from "@/design-system/typography";
import { useEerc } from "@/features/eerc/useEerc";
import { useProfile } from "@/features/profile/useProfile";
import { buildMyCode } from "@/features/qr/code";

// Show the wallet's QR so a friend can scan it to pay or add you. Encodes the raw
// address (see features/qr/code.ts); the Copy chip is the no-camera fallback.
export default function MyCode() {
  const { colors } = useTheme();
  const { address } = useEerc();
  const profile = useProfile(address ?? null);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    if (!address || typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }
    void navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <ScreenContainer>
      <ScreenHeader title="My QR code" />
      <View style={styles.body}>
        <Avatar name={profile.data?.display_name ?? "Hush"} size={64} />
        <Text style={[styles.name, { color: colors.ink }]} numberOfLines={1}>
          {profile.data?.display_name ?? "Your profile"}
        </Text>
        {profile.data ? (
          <Text style={[styles.handle, { color: colors.sub }]}>@{profile.data.username}</Text>
        ) : null}

        <View style={[styles.qrCard, { backgroundColor: colors.card }]}>
          {address ? (
            <QrCode value={buildMyCode(address)} size={220} />
          ) : (
            <Text style={[styles.preparing, { color: colors.sub }]}>Preparing…</Text>
          )}
        </View>

        <Text style={[styles.hint, { color: colors.sub }]}>
          Have a friend scan this to pay or add you.
        </Text>

        <Pressable onPress={copy} style={[styles.addrChip, { backgroundColor: colors.chip }]}>
          <Text style={[styles.addr, { color: colors.sub }]} numberOfLines={1} selectable>
            {address ?? "Preparing…"}
          </Text>
          <Text style={[styles.copy, { color: colors.actBlue }]}>
            {copied ? "Copied" : "Copy"}
          </Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: { alignItems: "center", gap: spacing.sm, marginTop: spacing.sm },
  name: { fontFamily: fonts.ui, fontSize: 20, fontWeight: "700", marginTop: 6 },
  handle: { fontFamily: fonts.mono, fontSize: 13 },
  qrCard: {
    padding: spacing.lg,
    borderRadius: radius.card,
    marginTop: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  preparing: { fontFamily: fonts.ui, fontSize: 14, width: 220, height: 220, textAlign: "center", textAlignVertical: "center" },
  hint: { fontFamily: fonts.ui, fontSize: 13, textAlign: "center", marginTop: spacing.md },
  addrChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.pill,
    marginTop: spacing.md,
    maxWidth: "100%",
  },
  addr: { fontFamily: fonts.mono, fontSize: 11.5, flexShrink: 1 },
  copy: { fontFamily: fonts.ui, fontSize: 12, fontWeight: "600" },
});
