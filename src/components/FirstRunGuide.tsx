import Feather from "@expo/vector-icons/Feather";
import type { ComponentProps } from "react";
import { useEffect, useState } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import { Button } from "@/design-system/primitives/Button";
import { useTheme } from "@/design-system/theme";
import { radius, spacing } from "@/design-system/tokens";
import { fonts, typeScale } from "@/design-system/typography";
import { useEerc } from "@/features/eerc/useEerc";
import { hasSeenFirstRun, markFirstRunSeen } from "@/features/firstRun";

type FeatherName = ComponentProps<typeof Feather>["name"];

const TIPS: { icon: FeatherName; title: string; body: string }[] = [
  {
    icon: "lock",
    title: "Private by default",
    body: "Amounts stay hidden on-chain — only you and the other person can see them.",
  },
  {
    icon: "globe",
    title: "Feed",
    body: "See public and friends' payments — react with an emoji or leave a comment.",
  },
  {
    icon: "user-plus",
    title: "Add friends",
    body: "Add contacts under Me → Contacts (or the People tab) so their payments show in your Friends feed.",
  },
  {
    icon: "activity",
    title: "Activity",
    body: "Your own history: money added, sent, received, and cashed out.",
  },
  {
    icon: "send",
    title: "Pay or request",
    body: "Tap Pay to send money or request it from someone in a couple of taps.",
  },
];

// One-time welcome shown the first time a wallet enters the app (after profile setup).
// Mounted inside the signed-in shell; a per-address localStorage flag keeps it one-time.
export function FirstRunGuide() {
  const { colors } = useTheme();
  const { address } = useEerc();
  const me = address?.toLowerCase();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (me && !hasSeenFirstRun(me)) {
      setShow(true);
    }
  }, [me]);

  const dismiss = () => {
    if (me) {
      markFirstRunSeen(me);
    }
    setShow(false);
  };

  if (!show) {
    return null;
  }

  return (
    <Modal transparent visible animationType="fade" onRequestClose={dismiss}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[typeScale.screenTitle, { color: colors.ink }]}>
            Welcome to Hush 👋
          </Text>
          <Text style={[styles.lead, { color: colors.sub }]}>A quick tour:</Text>
          <View style={styles.tips}>
            {TIPS.map((t) => (
              <View key={t.title} style={styles.tip}>
                <View style={[styles.tipIcon, { backgroundColor: colors.chip }]}>
                  <Feather name={t.icon} size={16} color={colors.actBlue} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.tipTitle, { color: colors.ink }]}>{t.title}</Text>
                  <Text style={[styles.tipBody, { color: colors.sub }]}>{t.body}</Text>
                </View>
              </View>
            ))}
          </View>
          <Button label="Got it" variant="primary" onPress={dismiss} style={styles.cta} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: radius.cardLg,
    padding: spacing.xl,
  },
  lead: { fontFamily: fonts.ui, fontSize: 14, marginTop: spacing.xs },
  tips: { marginTop: spacing.lg, gap: spacing.lg },
  tip: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  tipIcon: { width: 34, height: 34, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  tipTitle: { fontFamily: fonts.ui, fontSize: 14.5, fontWeight: "700" },
  tipBody: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 18, marginTop: 1 },
  cta: { marginTop: spacing.xl },
});
