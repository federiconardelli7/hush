import { router } from "expo-router";
import { FlatList, StyleSheet, Text } from "react-native";
import { ContactRow } from "@/components/ContactRow";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Button } from "@/design-system/primitives/Button";
import { ScreenContainer } from "@/design-system/primitives/ScreenContainer";
import { useTheme } from "@/design-system/theme";
import { spacing } from "@/design-system/tokens";
import { fonts } from "@/design-system/typography";
import { useContacts } from "@/features/contacts/useContacts";
import { useEerc } from "@/features/eerc/useEerc";

export default function Contacts() {
  const { colors } = useTheme();
  const { address } = useEerc();
  const me = address?.toLowerCase();
  const contacts = useContacts(me);

  return (
    <ScreenContainer>
      <ScreenHeader title="Contacts" />
      <Button
        label="Add a contact"
        variant="primary"
        onPress={() => router.push("/add-contact")}
        style={styles.add}
      />
      <FlatList
        data={contacts.data ?? []}
        keyExtractor={(c) => c.contact_address}
        renderItem={({ item }) => (
          <ContactRow
            item={item}
            onPress={() =>
              router.push({
                pathname: "/contact",
                params: { address: item.contact_address, nickname: item.nickname },
              })
            }
          />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.sub }]}>
            {contacts.isLoading
              ? "Loading…"
              : "No contacts yet. Add someone to pay them in one tap."}
          </Text>
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  add: { marginTop: spacing.sm },
  list: { paddingTop: spacing.md, gap: spacing.sm },
  empty: {
    fontFamily: fonts.ui,
    fontSize: 14,
    textAlign: "center",
    marginTop: spacing.xl,
    lineHeight: 21,
  },
});
