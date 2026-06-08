import { router } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { isAddress } from "viem";
import { ContactRow } from "@/components/ContactRow";
import { DesktopScreen } from "@/components/DesktopScreen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Avatar } from "@/design-system/primitives/Avatar";
import { Button } from "@/design-system/primitives/Button";
import { EmptyState } from "@/design-system/primitives/EmptyState";
import { ScreenContainer } from "@/design-system/primitives/ScreenContainer";
import { SkeletonList } from "@/design-system/primitives/Skeleton";
import { useTheme } from "@/design-system/theme";
import { radius, spacing } from "@/design-system/tokens";
import { fonts } from "@/design-system/typography";
import { useIsWide } from "@/design-system/useResponsive";
import type { ContactItem } from "@/features/contacts/useContacts";
import { useContacts } from "@/features/contacts/useContacts";
import { useEerc } from "@/features/eerc/useEerc";
import { profilesRepo } from "@/features/profile/profilesRepo";
import type { Profile } from "@/features/profile/schema";

export default function Contacts() {
  const { colors } = useTheme();
  const { address } = useEerc();
  const me = address?.toLowerCase();
  const contacts = useContacts(me);
  const isWide = useIsWide();

  // Search-to-add (desktop): mirrors add-contact's debounced username search + paste-address detection.
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);

  useEffect(() => {
    const q = query.trim();
    if (q.startsWith("0x") || q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const r = await profilesRepo.searchByUsername(q);
        if (!cancelled) setResults(r.filter((p) => p.address !== me));
      } catch {
        if (!cancelled) setResults([]);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, me]);

  const trimmed = query.trim();
  const pasteAddress = isAddress(trimmed) ? trimmed.toLowerCase() : null;
  const searching = trimmed.length > 0;

  // Hands a matched profile / pasted address to the existing add-contact flow (it auto-picks `address`).
  const openAdd = (addr: string) =>
    router.push({ pathname: "/add-contact", params: { address: addr } });

  // Opens the contact's detail/pay flow — same destination as the mobile ContactRow press.
  const openContact = (item: ContactItem) =>
    router.push({
      pathname: "/contact",
      params: { address: item.contact_address, nickname: item.nickname },
    });

  if (isWide) {
    const list = contacts.data ?? [];
    return (
      <DesktopScreen title="People" maxWidth={760}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="@username or paste an address"
          placeholderTextColor={colors.sub}
          autoCapitalize="none"
          autoCorrect={false}
          style={[
            styles.search,
            { backgroundColor: colors.card, color: colors.ink, borderColor: colors.line },
          ]}
        />

        {searching ? (
          <View style={styles.results}>
            {pasteAddress ? (
              <Pressable
                onPress={() => openAdd(pasteAddress)}
                style={[styles.resultRow, { backgroundColor: colors.card, borderColor: colors.line }]}
              >
                <Avatar name="0 x" size={40} />
                <Text style={[styles.resultName, { color: colors.ink, flex: 1 }]} numberOfLines={1}>
                  Add {pasteAddress.slice(0, 6)}…{pasteAddress.slice(-4)}
                </Text>
              </Pressable>
            ) : null}
            {results.map((p) => (
              <Pressable
                key={p.address}
                onPress={() => openAdd(p.address)}
                style={[styles.resultRow, { backgroundColor: colors.card, borderColor: colors.line }]}
              >
                <Avatar name={p.display_name} size={40} />
                <View style={styles.cardWho}>
                  <Text style={[styles.resultName, { color: colors.ink }]} numberOfLines={1}>
                    {p.display_name}
                  </Text>
                  <Text style={[styles.cardHandle, { color: colors.sub }]} numberOfLines={1}>
                    @{p.username}
                  </Text>
                </View>
              </Pressable>
            ))}
            {!pasteAddress && results.length === 0 ? (
              <EmptyState icon="search" title="No one found" subtitle="Try a different name, or paste an address." />
            ) : null}
          </View>
        ) : list.length === 0 ? (
          contacts.isLoading ? (
            <SkeletonList />
          ) : (
            <EmptyState icon="users" title="No contacts yet" subtitle="Add someone to pay them in one tap." />
          )
        ) : (
          <View style={styles.grid}>
            {list.map((item) => (
              <Pressable
                key={item.contact_address}
                onPress={() => openContact(item)}
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
              </Pressable>
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
          contacts.isLoading ? (
            <SkeletonList />
          ) : (
            <EmptyState icon="users" title="No contacts yet" subtitle="Add someone to pay them in one tap." />
          )
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  add: { marginTop: spacing.sm },
  list: { paddingTop: spacing.md, gap: spacing.sm },
  // Desktop (≥900px) — search-to-add, then the contacts grid below.
  search: {
    fontFamily: fonts.ui,
    fontSize: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radius.input,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  results: { gap: spacing.sm },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: 12,
    borderRadius: radius.button,
    borderWidth: 1,
  },
  resultName: { fontFamily: fonts.ui, fontSize: 15, fontWeight: "600" },
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
});
