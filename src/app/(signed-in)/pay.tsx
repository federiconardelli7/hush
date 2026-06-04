import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";
import { isAddress } from "viem";
import { Avatar } from "@/design-system/primitives/Avatar";
import { ScreenContainer } from "@/design-system/primitives/ScreenContainer";
import { useTheme } from "@/design-system/theme";
import { radius, spacing } from "@/design-system/tokens";
import { fonts, typeScale } from "@/design-system/typography";
import { useEerc } from "@/features/eerc/useEerc";
import { profilesRepo } from "@/features/profile/profilesRepo";
import type { Profile } from "@/features/profile/schema";

export default function Pay() {
  const { colors } = useTheme();
  const { address } = useEerc();
  const me = address?.toLowerCase();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.startsWith("0x") || q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const r = await profilesRepo.searchByUsername(q);
        if (!cancelled) setResults(r);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const goAmount = (to: string, name: string) =>
    router.push({ pathname: "/pay-amount", params: { to, name } });

  const trimmed = query.trim();
  const pasteAddress = isAddress(trimmed) ? trimmed : null;

  return (
    <ScreenContainer>
      <Text style={[typeScale.screenTitle, { color: colors.ink }]}>Pay</Text>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="@username or paste an address"
        placeholderTextColor={colors.sub}
        autoCapitalize="none"
        autoCorrect={false}
        style={[
          styles.input,
          { backgroundColor: colors.card, color: colors.ink, borderColor: colors.line },
        ]}
      />

      {pasteAddress ? (
        <Pressable
          onPress={() =>
            goAmount(pasteAddress, `${pasteAddress.slice(0, 6)}…${pasteAddress.slice(-4)}`)
          }
          style={[styles.item, { backgroundColor: colors.card, borderColor: colors.line }]}
        >
          <Avatar name="0 x" size={40} />
          <Text style={[styles.name, { color: colors.ink, flex: 1 }]} numberOfLines={1}>
            Pay {pasteAddress.slice(0, 10)}…{pasteAddress.slice(-6)}
          </Text>
        </Pressable>
      ) : null}

      {searching ? (
        <ActivityIndicator color={colors.actBlue} style={styles.spinner} />
      ) : null}

      <FlatList
        data={results.filter((p) => p.address !== me)}
        keyExtractor={(p) => p.address}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => goAmount(item.address, item.display_name)}
            style={[styles.item, { backgroundColor: colors.card, borderColor: colors.line }]}
          >
            <Avatar name={item.display_name} size={40} />
            <Text style={styles.who}>
              <Text style={[styles.name, { color: colors.ink }]}>{item.display_name}</Text>
              {"\n"}
              <Text style={[styles.handle, { color: colors.sub }]}>@{item.username}</Text>
            </Text>
          </Pressable>
        )}
        contentContainerStyle={styles.list}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  input: {
    fontFamily: fonts.ui,
    fontSize: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radius.input,
    borderWidth: 1,
    marginTop: spacing.md,
  },
  spinner: { marginTop: spacing.md },
  list: { paddingTop: spacing.md, gap: spacing.sm },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: 12,
    borderRadius: radius.button,
    borderWidth: 1,
  },
  who: { flex: 1 },
  name: { fontFamily: fonts.ui, fontSize: 15, fontWeight: "600" },
  handle: { fontFamily: fonts.mono, fontSize: 12.5 },
});
