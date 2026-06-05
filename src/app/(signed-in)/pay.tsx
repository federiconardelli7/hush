import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { isAddress } from "viem";
import { ContactRow } from "@/components/ContactRow";
import { DesktopScreen } from "@/components/DesktopScreen";
import { Avatar } from "@/design-system/primitives/Avatar";
import { ScreenContainer } from "@/design-system/primitives/ScreenContainer";
import { useTheme } from "@/design-system/theme";
import { radius, spacing } from "@/design-system/tokens";
import { fonts } from "@/design-system/typography";
import { useIsWide } from "@/design-system/useResponsive";
import { useContacts } from "@/features/contacts/useContacts";
import { useEerc } from "@/features/eerc/useEerc";
import { profilesRepo } from "@/features/profile/profilesRepo";
import type { Profile } from "@/features/profile/schema";

export default function Pay() {
  const { colors } = useTheme();
  const { address } = useEerc();
  const me = address?.toLowerCase();
  const params = useLocalSearchParams<{ mode?: string }>();
  const [isRequest, setIsRequest] = useState(params.mode === "request");
  const contacts = useContacts(me);
  const nickByAddr = new Map(
    (contacts.data ?? []).map((c) => [c.contact_address, c.nickname]),
  );
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
    router.push({
      pathname: isRequest ? "/request-amount" : "/pay-amount",
      params: { to, name },
    });

  const trimmed = query.trim();
  const pasteAddress = isAddress(trimmed) ? trimmed : null;

  const isWide = useIsWide();

  if (isWide) {
    const contactList = contacts.data ?? [];
    const resultList = results.filter((p) => p.address !== me);
    const desktopBody = (
      <>
        <View style={styles.modeRow}>
          {([false, true] as const).map((req) => {
            const on = req === isRequest;
            return (
              <Pressable
                key={req ? "request" : "pay"}
                onPress={() => setIsRequest(req)}
                style={[styles.modeSeg, { backgroundColor: on ? colors.ink : colors.chip }]}
              >
                <Text style={[styles.modeSegText, { color: on ? colors.bg : colors.sub }]}>
                  {req ? "Request" : "Pay"}
                </Text>
              </Pressable>
            );
          })}
        </View>
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
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/scan",
              params: { intent: "pay", mode: isRequest ? "request" : "pay" },
            })
          }
          style={styles.scan}
        >
          <Text style={[styles.scanText, { color: colors.actBlue }]}>📷  Scan a code</Text>
        </Pressable>

        {trimmed.length === 0 ? (
          <View style={styles.list}>
            {contactList.length > 0 ? (
              <Text style={[styles.section, { color: colors.sub }]}>Your contacts</Text>
            ) : null}
            {contactList.map((item) => (
              <ContactRow
                key={item.contact_address}
                item={item}
                onPress={() => goAmount(item.contact_address, item.nickname)}
              />
            ))}
          </View>
        ) : (
          <>
            {pasteAddress ? (
              <Pressable
                onPress={() =>
                  goAmount(pasteAddress, `${pasteAddress.slice(0, 6)}…${pasteAddress.slice(-4)}`)
                }
                style={[styles.item, { backgroundColor: colors.card, borderColor: colors.line }]}
              >
                <Avatar name="0 x" size={40} />
                <Text style={[styles.name, { color: colors.ink, flex: 1 }]} numberOfLines={1}>
                  {isRequest ? "Request from" : "Pay"} {pasteAddress.slice(0, 10)}…
                  {pasteAddress.slice(-6)}
                </Text>
              </Pressable>
            ) : null}

            {searching ? (
              <ActivityIndicator color={colors.actBlue} style={styles.spinner} />
            ) : null}

            <View style={styles.list}>
              {resultList.map((item) => {
                const name = nickByAddr.get(item.address) ?? item.display_name;
                return (
                  <Pressable
                    key={item.address}
                    onPress={() => goAmount(item.address, name)}
                    style={[styles.item, { backgroundColor: colors.card, borderColor: colors.line }]}
                  >
                    <Avatar name={name} size={40} />
                    <Text style={styles.who}>
                      <Text style={[styles.name, { color: colors.ink }]}>{name}</Text>
                      {"\n"}
                      <Text style={[styles.handle, { color: colors.sub }]}>@{item.username}</Text>
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </>
    );
    return (
      <DesktopScreen title="Pay or request" back maxWidth={560}>
        {desktopBody}
      </DesktopScreen>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.modeRow}>
        {([false, true] as const).map((req) => {
          const on = req === isRequest;
          return (
            <Pressable
              key={req ? "request" : "pay"}
              onPress={() => setIsRequest(req)}
              style={[styles.modeSeg, { backgroundColor: on ? colors.ink : colors.chip }]}
            >
              <Text style={[styles.modeSegText, { color: on ? colors.bg : colors.sub }]}>
                {req ? "Request" : "Pay"}
              </Text>
            </Pressable>
          );
        })}
      </View>
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
      <Pressable
        onPress={() =>
          router.push({
            pathname: "/scan",
            params: { intent: "pay", mode: isRequest ? "request" : "pay" },
          })
        }
        style={styles.scan}
      >
        <Text style={[styles.scanText, { color: colors.actBlue }]}>📷  Scan a code</Text>
      </Pressable>

      {trimmed.length === 0 ? (
        <FlatList
          data={contacts.data ?? []}
          keyExtractor={(c) => c.contact_address}
          renderItem={({ item }) => (
            <ContactRow
              item={item}
              onPress={() => goAmount(item.contact_address, item.nickname)}
            />
          )}
          ListHeaderComponent={
            (contacts.data?.length ?? 0) > 0 ? (
              <Text style={[styles.section, { color: colors.sub }]}>Your contacts</Text>
            ) : null
          }
          contentContainerStyle={styles.list}
        />
      ) : (
        <>
          {pasteAddress ? (
            <Pressable
              onPress={() =>
                goAmount(pasteAddress, `${pasteAddress.slice(0, 6)}…${pasteAddress.slice(-4)}`)
              }
              style={[styles.item, { backgroundColor: colors.card, borderColor: colors.line }]}
            >
              <Avatar name="0 x" size={40} />
              <Text style={[styles.name, { color: colors.ink, flex: 1 }]} numberOfLines={1}>
                {isRequest ? "Request from" : "Pay"} {pasteAddress.slice(0, 10)}…
                {pasteAddress.slice(-6)}
              </Text>
            </Pressable>
          ) : null}

          {searching ? (
            <ActivityIndicator color={colors.actBlue} style={styles.spinner} />
          ) : null}

          <FlatList
            data={results.filter((p) => p.address !== me)}
            keyExtractor={(p) => p.address}
            renderItem={({ item }) => {
              const name = nickByAddr.get(item.address) ?? item.display_name;
              return (
                <Pressable
                  onPress={() => goAmount(item.address, name)}
                  style={[styles.item, { backgroundColor: colors.card, borderColor: colors.line }]}
                >
                  <Avatar name={name} size={40} />
                  <Text style={styles.who}>
                    <Text style={[styles.name, { color: colors.ink }]}>{name}</Text>
                    {"\n"}
                    <Text style={[styles.handle, { color: colors.sub }]}>@{item.username}</Text>
                  </Text>
                </Pressable>
              );
            }}
            contentContainerStyle={styles.list}
          />
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  modeRow: { flexDirection: "row", gap: spacing.sm },
  modeSeg: { flex: 1, paddingVertical: 11, borderRadius: radius.pill, alignItems: "center" },
  modeSegText: { fontFamily: fonts.ui, fontSize: 14, fontWeight: "700" },
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
  scan: { alignSelf: "flex-start", paddingVertical: spacing.sm, marginTop: spacing.xs },
  scanText: { fontFamily: fonts.ui, fontSize: 13.5, fontWeight: "600" },
  section: { fontFamily: fonts.ui, fontSize: 13, fontWeight: "600", marginTop: spacing.md, marginBottom: spacing.xs },
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
