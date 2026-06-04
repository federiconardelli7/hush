import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Button } from "@/design-system/primitives/Button";
import { ScreenContainer } from "@/design-system/primitives/ScreenContainer";
import { useTheme } from "@/design-system/theme";
import { radius, spacing } from "@/design-system/tokens";
import { fonts, typeScale } from "@/design-system/typography";
import { profilesRepo } from "@/features/profile/profilesRepo";
import { displayNameSchema, usernameSchema } from "@/features/profile/schema";

// Onboarding profile step: name + @username, written to `profiles` through the
// wallet's Supabase session (the first RLS-gated write). On success the profile
// query is invalidated, so ProfileGate re-renders into the app.
export function ProfileSetup({ address }: { address: `0x${string}` }) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onSubmit = async () => {
    if (saving) return;
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save your profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.body}>
        <Text style={[typeScale.screenTitle, { color: colors.ink }]}>
          Set up your profile
        </Text>
        <Text style={[styles.sub, { color: colors.sub }]}>
          This is how friends find and recognise you. Your address stays private
          unless you share it.
        </Text>

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
            onSubmitEditing={onSubmit}
            style={[styles.usernameInput, { color: colors.ink }]}
          />
        </View>

        {error ? (
          <Text style={[styles.error, { color: colors.avRed }]}>{error}</Text>
        ) : null}
      </View>

      <View style={styles.actions}>
        <Button
          label={saving ? "Saving…" : "Continue"}
          variant="primary"
          onPress={onSubmit}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, justifyContent: "center", gap: spacing.md },
  sub: { fontFamily: fonts.ui, fontSize: 14.5, lineHeight: 21, maxWidth: 340 },
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
  error: { fontFamily: fonts.ui, fontSize: 13 },
  actions: { paddingBottom: spacing.xl },
});
