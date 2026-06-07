import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { QrCode } from "@/components/QrCode";
import { useTheme } from "@/design-system/theme";
import { radius, spacing } from "@/design-system/tokens";
import { fonts } from "@/design-system/typography";

const shorten = (a: string) => `${a.slice(0, 10)}…${a.slice(-8)}`;

// Funding panel for USDC: there's no in-app faucet, so the user funds by sending
// USDC to their own wallet address — tap the address to copy it, grab test USDC
// from Circle, then tap Add to deposit. (Web copy via navigator.clipboard, which is
// available on localhost/https; native would use expo-clipboard later.)
export function FundUsdcCard({ address }: { address: string | null }) {
  const { colors } = useTheme();
  const [copied, setCopied] = useState(false);

  const copy = () => {
    if (!address || typeof navigator === "undefined" || !navigator.clipboard) return;
    void navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.line }]}>
      <Text style={[styles.heading, { color: colors.ink }]}>Add USDC</Text>

      {address ? (
        <QrCode value={address} size={132} />
      ) : (
        <Text style={[styles.preparing, { color: colors.sub }]}>Preparing…</Text>
      )}

      <Pressable
        onPress={copy}
        disabled={!address}
        style={[styles.addrRow, { backgroundColor: colors.chip }]}
      >
        <Text style={[styles.addr, { color: colors.ink }]} numberOfLines={1}>
          {address ? shorten(address) : "Preparing…"}
        </Text>
        <Feather
          name={copied ? "check" : "copy"}
          size={14}
          color={copied ? colors.positive : colors.sub}
        />
      </Pressable>

      <Pressable
        onPress={() => void Linking.openURL("https://faucet.circle.com")}
        hitSlop={8}
      >
        <Text style={[styles.linkText, { color: colors.actBlue }]}>
          Get test USDC from Circle ↗
        </Text>
      </Pressable>

      <Text style={[styles.note, { color: colors.sub }]}>
        {copied
          ? "Address copied — paste it in the faucet, then tap Add."
          : "Copy your address, get USDC from the faucet, then tap Add."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.button,
    borderWidth: 1,
  },
  heading: { fontFamily: fonts.ui, fontSize: 15, fontWeight: "700" },
  preparing: {
    fontFamily: fonts.ui,
    fontSize: 14,
    width: 132,
    height: 132,
    textAlign: "center",
  },
  addrRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.pill,
    maxWidth: "100%",
  },
  addr: { fontFamily: fonts.mono, fontSize: 12.5, flexShrink: 1 },
  linkText: { fontFamily: fonts.ui, fontSize: 13, fontWeight: "600" },
  note: { fontFamily: fonts.ui, fontSize: 12, textAlign: "center", maxWidth: 280 },
});
