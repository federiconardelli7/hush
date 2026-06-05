import { router } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { ContactRow } from "@/components/ContactRow";
import { DesktopScreen } from "@/components/DesktopScreen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Avatar } from "@/design-system/primitives/Avatar";
import { Button } from "@/design-system/primitives/Button";
import { ScreenContainer } from "@/design-system/primitives/ScreenContainer";
import { useTheme } from "@/design-system/theme";
import { spacing } from "@/design-system/tokens";
import { fonts } from "@/design-system/typography";
import { useIsWide } from "@/design-system/useResponsive";
import type { ContactItem } from "@/features/contacts/useContacts";
import { useContacts } from "@/features/contacts/useContacts";
import { useEerc } from "@/features/eerc/useEerc";

export default function Contacts() {
  const { colors } = useTheme();
  const { address } = useEerc();
  const me = address?.toLowerCase();
  const contacts = useContacts(me);
  const isWide = useIsWide();

  // Opens the contact's detail/pay flow — same destination as the mobile ContactRow press.
  const openContact = (item: ContactItem) =>
    router.push({
      pathname: "/contact",
      params: { address: item.contact_address, nickname: item.nickname },
    });

  if (isWide) {
    const list = contacts.data ?? [];
    return (
      <DesktopScreen
        title="People"
        maxWidth={760}
        head={
          <Pressable
            onPress={() => router.push("/add-contact")}
            style={[styles.addBtn, { backgroundColor: colors.actBlue }]}
          >
            <Text style={styles.addBtnLabel}>＋ Add</Text>
          </Pressable>
        }
      >
        <Pressable
          onPress={() => router.push("/add-contact")}
          style={[styles.addByAddress, { borderColor: colors.line }]}
        >
          <View style={[styles.addrChip, { backgroundColor: colors.chip }]}>
            <Text style={[styles.addrChipText, { color: colors.sub }]}>0x</Text>
          </View>
          <Text style={[styles.addByLabel, { color: colors.ink }]}>Add by C-Chain address</Text>
          <Text style={[styles.chevron, { color: colors.sub }]}>›</Text>
        </Pressable>

        {list.length === 0 ? (
          <Text style={[styles.empty, { color: colors.sub }]}>
            {contacts.isLoading
              ? "Loading…"
              : "No contacts yet. Add someone to pay them in one tap."}
          </Text>
        ) : (
          <View style={styles.grid}>
            {list.map((item) => (
              <View
                key={item.contact_address}
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.line }]}
              >
                <Avatar name={item.nickname} size={42} />
                <View style={styles.cardWho}>
                  <Text style={[styles.cardName, { color: colors.ink }]} numberOfLines={1}>
                    {item.nickname}
                  </Text>
                  {item.profile ? (
                    <Text style={[styles.cardHandle, { color: colors.sub }]} numberOfLines={1}>
                      @{item.profile.username}
                    </Text>
                  ) : null}
                </View>
                <Pressable
                  onPress={() => openContact(item)}
                  style={[styles.payChip, { backgroundColor: colors.chip }]}
                >
                  <Text style={[styles.payChipLabel, { color: colors.ink }]}>Pay</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </DesktopScreen>
    );
  }

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
          <ContactRow item={item} onPress={() => openContact(item)} />
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
  // Desktop (≥900px) — mirrors WebPeople in design_handoff_hush/hifi-web.jsx.
  addBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  addBtnLabel: { fontFamily: fonts.ui, fontSize: 13.5, fontWeight: "700", color: "#fff" },
  addByAddress: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 16,
    padding: 14,
    marginBottom: spacing.lg,
  },
  addrChip: { width: 40, height: 40, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  addrChipText: { fontFamily: fonts.mono, fontSize: 13, fontWeight: "600" },
  addByLabel: { flex: 1, fontFamily: fonts.ui, fontSize: 14.5, fontWeight: "600" },
  chevron: { fontFamily: fonts.ui, fontSize: 20 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  card: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  cardWho: { flex: 1, minWidth: 0 },
  cardName: { fontFamily: fonts.ui, fontSize: 14.5, fontWeight: "600" },
  cardHandle: { fontFamily: fonts.mono, fontSize: 11.5 },
  payChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999 },
  payChipLabel: { fontFamily: fonts.ui, fontSize: 13, fontWeight: "600" },
});
