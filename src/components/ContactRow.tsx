import { Pressable, StyleSheet, Text, View } from "react-native";
import { Avatar } from "@/design-system/primitives/Avatar";
import { useTheme } from "@/design-system/theme";
import { radius, spacing } from "@/design-system/tokens";
import { fonts } from "@/design-system/typography";
import type { ContactItem } from "@/features/contacts/useContacts";

// A saved contact: nickname + @username. Used by the contacts list and the Pay
// quick-picks.
export function ContactRow({
  item,
  onPress,
}: {
  item: ContactItem;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, { backgroundColor: colors.card, borderColor: colors.line }]}
    >
      <Avatar name={item.nickname} size={42} />
      <View style={styles.who}>
        <Text style={[styles.name, { color: colors.ink }]} numberOfLines={1}>
          {item.nickname}
        </Text>
        {item.profile ? (
          <Text style={[styles.handle, { color: colors.sub }]} numberOfLines={1}>
            @{item.profile.username}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: 12,
    borderRadius: radius.button,
    borderWidth: 1,
  },
  who: { flex: 1, minWidth: 0 },
  name: { fontFamily: fonts.ui, fontSize: 15, fontWeight: "600" },
  handle: { fontFamily: fonts.mono, fontSize: 12.5 },
});
