import Feather from "@expo/vector-icons/Feather";
import type { ComponentProps, ReactNode } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ScreenContainer } from "@/design-system/primitives/ScreenContainer";
import { useTheme } from "@/design-system/theme";
import { radius, spacing } from "@/design-system/tokens";
import { fonts } from "@/design-system/typography";
import { useEerc } from "@/features/eerc/useEerc";
import { notificationPrefsRepo } from "@/features/push/notificationPrefsRepo";
import {
  setSocialPref,
  useSocialPrefs,
  type SocialPrefs,
} from "@/features/notifications/socialPrefs";

type FeatherName = ComponentProps<typeof Feather>["name"];

function ToggleRow({
  icon,
  label,
  sub,
  value,
  onValueChange,
  first,
}: {
  icon: ReactNode;
  label: string;
  sub: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  first?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.row, first ? null : { borderTopWidth: 1, borderTopColor: colors.line }]}
    >
      <View style={styles.rowIcon}>{icon}</View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.label, { color: colors.ink }]}>{label}</Text>
        <Text style={[styles.sub, { color: colors.sub }]}>{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: colors.actBlue, false: colors.line }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

// Settings → Notifications. The only configurable kinds are the social ones (likes +
// comments on your payments), both OFF by default — opt in here. Money received and
// requests always notify, so there's nothing to toggle for them.
export default function NotificationSettings() {
  const { colors } = useTheme();
  const { address } = useEerc();
  const me = address?.toLowerCase();
  const prefs = useSocialPrefs(me);
  const onToggle = (key: keyof SocialPrefs) => (value: boolean) => {
    setSocialPref(me, key, value);
    // Mirror to the server so the push sender sees the same gates (best-effort;
    // the in-app inbox keeps reading the local store).
    if (me) {
      void notificationPrefsRepo.upsert(me, { ...prefs, [key]: value }).catch((error) => {
        console.error("prefs mirror failed:", error);
      });
    }
  };

  const social: { key: keyof SocialPrefs; icon: FeatherName; label: string; sub: string }[] = [
    { key: "likes", icon: "heart", label: "Likes", sub: "When someone likes your payment" },
    {
      key: "comments",
      icon: "message-circle",
      label: "Comments",
      sub: "When someone comments on your payment",
    },
    {
      key: "mentions",
      icon: "at-sign",
      label: "Mentions",
      sub: "When someone @mentions you in a comment",
    },
  ];

  return (
    <ScreenContainer>
      <ScreenHeader title="Notifications" />
      <Text style={[styles.section, { color: colors.sub }]}>SOCIAL</Text>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {social.map((s, i) => (
          <ToggleRow
            key={s.key}
            icon={<Feather name={s.icon} size={18} color={colors.sub} />}
            label={s.label}
            sub={s.sub}
            value={prefs[s.key]}
            onValueChange={onToggle(s.key)}
            first={i === 0}
          />
        ))}
      </View>
      <Text style={[styles.foot, { color: colors.sub }]}>
        Likes and comments are off by default; mentions are on. Money you receive and
        payment requests always notify you.
      </Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  section: {
    fontFamily: fonts.ui,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  card: { borderRadius: radius.card, paddingHorizontal: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 13, paddingVertical: 14 },
  rowIcon: { width: 22, alignItems: "center" },
  label: { fontFamily: fonts.ui, fontSize: 15, fontWeight: "500" },
  sub: { fontFamily: fonts.ui, fontSize: 12, marginTop: 1 },
  foot: { fontFamily: fonts.ui, fontSize: 12, lineHeight: 17, marginTop: spacing.md },
});
