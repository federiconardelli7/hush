import Feather from "@expo/vector-icons/Feather";
import type { ComponentProps } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ScreenContainer } from "@/design-system/primitives/ScreenContainer";
import { useTheme } from "@/design-system/theme";
import { radius, spacing } from "@/design-system/tokens";
import { fonts } from "@/design-system/typography";
import { useEerc } from "@/features/eerc/useEerc";

// Honest, read-only explanation of Hush's actual privacy model — no toggles
// (nothing here is user-configurable yet), no claims the protocol doesn't back.
type FeatherName = ComponentProps<typeof Feather>["name"];

const ITEMS: { icon: FeatherName; title: string; body: string; badge?: string }[] = [
  {
    icon: "lock",
    title: "Encrypted amounts",
    body: "Every payment amount and your balance are encrypted on-chain. Only you — and the people you transact with — can decrypt them.",
    badge: "Always on",
  },
  {
    icon: "users",
    title: "What's public",
    body: "Who paid whom is public — that's what makes the social feed work. The amounts and balances are never revealed.",
  },
  {
    icon: "mail",
    title: "Memos & requests",
    body: "Payment notes and money-request amounts are end-to-end encrypted to the two parties — the server can't read them.",
  },
  {
    icon: "shield",
    title: "Compliance auditor",
    body: "The eERC network has an auditor that can view amounts for oversight. On this testnet, that's the app deployer.",
  },
];

export default function Privacy() {
  const { colors } = useTheme();
  const { address } = useEerc();
  return (
    <ScreenContainer>
      <ScreenHeader title="Privacy & security" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
      >
        {ITEMS.map((it) => (
          <View
            key={it.title}
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.line }]}
          >
            <View style={styles.cardHead}>
              <Feather name={it.icon} size={18} color={colors.ink} />
              <Text style={[styles.title, { color: colors.ink }]}>{it.title}</Text>
              {it.badge ? (
                <View style={[styles.badge, { backgroundColor: "rgba(31,157,99,0.14)" }]}>
                  <Text style={[styles.badgeText, { color: colors.positive }]}>
                    {it.badge}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.body, { color: colors.sub }]}>{it.body}</Text>
          </View>
        ))}

        <Text style={[styles.label, { color: colors.sub }]}>Your address</Text>
        <View
          style={[styles.addrBox, { backgroundColor: colors.card, borderColor: colors.line }]}
        >
          <Text style={[styles.addr, { color: colors.ink }]} selectable>
            {address ?? "—"}
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { paddingTop: spacing.sm, paddingBottom: spacing.xl, gap: spacing.md },
  card: { borderRadius: radius.card, borderWidth: 1, padding: 16 },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 9 },
  title: { fontFamily: fonts.ui, fontSize: 15, fontWeight: "700", flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  badgeText: { fontFamily: fonts.ui, fontSize: 11.5, fontWeight: "700" },
  body: { fontFamily: fonts.ui, fontSize: 13.5, lineHeight: 20, marginTop: 8 },
  label: {
    fontFamily: fonts.ui,
    fontSize: 12.5,
    fontWeight: "600",
    marginTop: spacing.sm,
  },
  addrBox: { borderRadius: radius.input, borderWidth: 1, paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  addr: { fontFamily: fonts.mono, fontSize: 13 },
});
