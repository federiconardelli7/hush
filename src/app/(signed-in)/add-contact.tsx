import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
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
import { ScreenHeader } from "@/components/ScreenHeader";
import { Avatar } from "@/design-system/primitives/Avatar";
import { Button } from "@/design-system/primitives/Button";
import { ScreenContainer } from "@/design-system/primitives/ScreenContainer";
import { useTheme } from "@/design-system/theme";
import { radius, spacing } from "@/design-system/tokens";
import { fonts } from "@/design-system/typography";
import { contactsRepo } from "@/features/contacts/contactsRepo";
import { useEerc } from "@/features/eerc/useEerc";
import { profilesRepo } from "@/features/profile/profilesRepo";
import type { Profile } from "@/features/profile/schema";

type Target = { address: string; profile: Profile | null };

function shorten(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export default function AddContact() {
  const { colors } = useTheme();
  const { address, isAddressRegistered } = useEerc();
  const me = address?.toLowerCase();
  const queryClient = useQueryClient();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [checking, setChecking] = useState(false);
  const [target, setTarget] = useState<Target | null>(null);
  const [nickname, setNickname] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (target) return;
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
        if (!cancelled) setResults(r.filter((p) => p.address !== me));
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
  }, [query, target, me]);

  const trimmed = query.trim();
  const pasteAddress = isAddress(trimmed) ? trimmed.toLowerCase() : null;

  const pick = async (addr: string, profile: Profile | null) => {
    setError(null);
    if (addr === me) {
      setError("That's your own address.");
      return;
    }
    setChecking(true);
    try {
      const ok = await isAddressRegistered(addr as `0x${string}`);
      if (!ok) {
        setError("That address hasn't joined Hush yet.");
        return;
      }
      setTarget({ address: addr, profile });
      setNickname(profile?.display_name ?? "");
    } catch {
      setError("Couldn't verify that address.");
    } finally {
      setChecking(false);
    }
  };

  const save = async () => {
    if (!me || !target || !nickname.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await contactsRepo.add({
        owner_address: me,
        contact_address: target.address,
        nickname: nickname.trim(),
      });
      await queryClient.invalidateQueries({ queryKey: ["contacts"] });
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the contact.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenContainer>
      <ScreenHeader title="Add a contact" />

      {!target ? (
        <>
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
              onPress={() => pick(pasteAddress, null)}
              style={[styles.item, { backgroundColor: colors.card, borderColor: colors.line }]}
            >
              <Avatar name="0 x" size={40} />
              <Text style={[styles.name, { color: colors.ink, flex: 1 }]} numberOfLines={1}>
                Add {shorten(pasteAddress)}
              </Text>
            </Pressable>
          ) : null}

          {searching || checking ? (
            <ActivityIndicator color={colors.actBlue} style={styles.spinner} />
          ) : null}

          <FlatList
            data={results}
            keyExtractor={(p) => p.address}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => pick(item.address, item)}
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
        </>
      ) : (
        <>
          <View style={[styles.target, { backgroundColor: colors.card, borderColor: colors.line }]}>
            <Avatar name={target.profile?.display_name ?? "0 x"} size={48} />
            <View style={{ flex: 1, minWidth: 0 }}>
              {target.profile ? (
                <Text style={[styles.handle, { color: colors.sub }]} numberOfLines={1}>
                  @{target.profile.username}
                </Text>
              ) : (
                <Text style={[styles.handle, { color: colors.sub }]} numberOfLines={1}>
                  {shorten(target.address)}
                </Text>
              )}
              <Text style={[styles.valid, { color: colors.positive }]}>
                ✓ Valid Hush account
              </Text>
            </View>
          </View>

          <Text style={[styles.label, { color: colors.sub }]}>Save as a private contact</Text>
          <TextInput
            value={nickname}
            onChangeText={setNickname}
            placeholder="Name this contact"
            placeholderTextColor={colors.sub}
            maxLength={40}
            style={[
              styles.input,
              { backgroundColor: colors.card, color: colors.ink, borderColor: colors.line },
            ]}
          />
          <Text style={[styles.note, { color: colors.sub }]}>
            🔒 The address is never shown in your feed — only this name.
          </Text>

          <Button
            label={busy ? "Saving…" : "Save contact"}
            variant="primary"
            onPress={save}
            style={styles.save}
          />
          <Pressable
            onPress={() => {
              setTarget(null);
              setNickname("");
              setError(null);
            }}
          >
            <Text style={[styles.again, { color: colors.actBlue }]}>Choose someone else</Text>
          </Pressable>
        </>
      )}

      {error ? <Text style={[styles.error, { color: colors.avRed }]}>{error}</Text> : null}
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
    marginTop: spacing.sm,
  },
  who: { flex: 1 },
  name: { fontFamily: fonts.ui, fontSize: 15, fontWeight: "600" },
  handle: { fontFamily: fonts.mono, fontSize: 12.5 },
  target: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: 14,
    borderRadius: radius.button,
    borderWidth: 1,
    marginTop: spacing.md,
  },
  valid: { fontFamily: fonts.ui, fontSize: 12.5, fontWeight: "600", marginTop: 2 },
  label: {
    fontFamily: fonts.ui,
    fontSize: 12.5,
    fontWeight: "600",
    marginTop: spacing.lg,
  },
  note: { fontFamily: fonts.ui, fontSize: 12, marginTop: spacing.sm, lineHeight: 18 },
  save: { marginTop: spacing.lg },
  again: { fontFamily: fonts.ui, fontSize: 13.5, fontWeight: "600", textAlign: "center", marginTop: spacing.md },
  error: { fontFamily: fonts.ui, fontSize: 13, textAlign: "center", marginTop: spacing.md },
});
