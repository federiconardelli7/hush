import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Button } from "@/design-system/primitives/Button";
import { ScreenContainer } from "@/design-system/primitives/ScreenContainer";
import { useTheme } from "@/design-system/theme";
import { radius, spacing } from "@/design-system/tokens";
import { fonts } from "@/design-system/typography";
import { useEerc } from "@/features/eerc/useEerc";
import { profilesRepo } from "@/features/profile/profilesRepo";
import { displayNameSchema, usernameSchema } from "@/features/profile/schema";
import { useProfile } from "@/features/profile/useProfile";

export default function EditProfile() {
  const { colors } = useTheme();
  const { address } = useEerc();
  const queryClient = useQueryClient();
  const profile = useProfile(address ?? null);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Prefill once the current profile loads.
  useEffect(() => {
    if (profile.data && !ready) {
      setDisplayName(profile.data.display_name);
      setUsername(profile.data.username);
      setReady(true);
    }
  }, [profile.data, ready]);

  const onSave = async () => {
    if (saving || !address) return;
    const name = displayNameSchema.safeParse(displayName);
    if (!name.success) {
      setError(name.error.issues[0]?.message ?? "Add your name.");
      return;
    }
    const uname = usernameSchema.safeParse(username);
    if (!uname.success) {
      setError(uname.error.issues[0]?.message ?? "Pick a valid username.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (!(await profilesRepo.isUsernameAvailable(uname.data, address))) {
        setError("That @username is taken.");
        return;
      }
      await profilesRepo.upsert({
        address,
        username: uname.data,
        display_name: name.data,
      });
      await queryClient.invalidateQueries({ queryKey: ["profile", address] });
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
      await queryClient.invalidateQueries({ queryKey: ["activity"] });
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save your profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer>
      <ScreenHeader title="Edit profile" />

      <View style={styles.body}>
        <Text style={[styles.label, { color: colors.sub }]}>Display name</Text>
        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Your name"
          placeholderTextColor={colors.sub}
          style={[
            styles.input,
            { backgroundColor: colors.card, color: colors.ink, borderColor: colors.line },
          ]}
        />

        <Text style={[styles.label, { color: colors.sub }]}>Username</Text>
        <View
          style={[
            styles.input,
            styles.usernameRow,
            { backgroundColor: colors.card, borderColor: colors.line },
          ]}
        >
          <Text style={[styles.at, { color: colors.sub }]}>@</Text>
          <TextInput
            value={username}
            onChangeText={(t) =>
              setUsername(t.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase())
            }
            placeholder="username"
            placeholderTextColor={colors.sub}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
            onSubmitEditing={onSave}
            style={[styles.usernameInput, { color: colors.ink }]}
          />
        </View>

        {error ? (
          <Text style={[styles.error, { color: colors.avRed }]}>{error}</Text>
        ) : null}
      </View>

      <View style={styles.actions}>
        <Button label={saving ? "Saving…" : "Save"} variant="primary" onPress={onSave} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: { marginTop: spacing.lg, gap: spacing.sm },
  label: { fontFamily: fonts.ui, fontSize: 12.5, fontWeight: "600", marginTop: spacing.sm },
  input: {
    fontFamily: fonts.ui,
    fontSize: 17,
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: radius.input,
    borderWidth: 1,
  },
  usernameRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  at: { fontFamily: fonts.ui, fontSize: 17, fontWeight: "600" },
  usernameInput: { flex: 1, fontFamily: fonts.ui, fontSize: 17, padding: 0 },
  error: { fontFamily: fonts.ui, fontSize: 13, marginTop: spacing.sm },
  actions: { marginTop: "auto", paddingBottom: spacing.xl },
});
