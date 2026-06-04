import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { RequestRow } from "@/components/RequestRow";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Button } from "@/design-system/primitives/Button";
import { ScreenContainer } from "@/design-system/primitives/ScreenContainer";
import { useTheme } from "@/design-system/theme";
import { radius, spacing } from "@/design-system/tokens";
import { fonts } from "@/design-system/typography";
import { useEerc } from "@/features/eerc/useEerc";
import { useRequests } from "@/features/requests/useRequests";

export default function Requests() {
  const { colors } = useTheme();
  const eerc = useEerc();
  const me = eerc.address?.toLowerCase();
  const requests = useRequests(me);
  const [unlocking, setUnlocking] = useState(false);

  const incoming = requests.data?.incoming ?? [];
  const outgoing = requests.data?.outgoing ?? [];

  const unlock = async () => {
    if (unlocking) return;
    setUnlocking(true);
    try {
      await eerc.enableDecryption();
    } catch {
      // surfaced by the ErrorBoundary
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <ScreenContainer>
      <ScreenHeader title="Requests" />

      {eerc.isRegistered && !eerc.isDecryptionKeySet ? (
        <View style={[styles.unlock, { backgroundColor: colors.card }]}>
          <Text style={[styles.unlockText, { color: colors.sub }]}>
            Unlock to reveal request amounts — one signature, never leaves this device.
          </Text>
          <Button
            label={unlocking ? "Unlocking…" : "Show amounts"}
            variant="primary"
            onPress={unlock}
          />
        </View>
      ) : null}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
      >
        {requests.isLoading ? (
          <Text style={[styles.empty, { color: colors.sub }]}>Loading…</Text>
        ) : incoming.length === 0 && outgoing.length === 0 ? (
          <Text style={[styles.empty, { color: colors.sub }]}>
            No requests yet. Tap Request on Home to ask someone for money.
          </Text>
        ) : null}

        {incoming.length > 0 ? (
          <Text style={[styles.section, { color: colors.sub }]}>Incoming</Text>
        ) : null}
        {incoming.map((r) => (
          <RequestRow key={r.id} item={r} direction="incoming" />
        ))}

        {outgoing.length > 0 ? (
          <Text style={[styles.section, { color: colors.sub }]}>You requested</Text>
        ) : null}
        {outgoing.map((r) => (
          <RequestRow key={r.id} item={r} direction="outgoing" />
        ))}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  unlock: {
    borderRadius: radius.card,
    padding: 16,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  unlockText: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 19 },
  list: { paddingTop: spacing.sm, paddingBottom: spacing.xl },
  section: {
    fontFamily: fonts.ui,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: spacing.sm,
  },
  empty: {
    fontFamily: fonts.ui,
    fontSize: 14,
    textAlign: "center",
    marginTop: spacing.xl,
    lineHeight: 21,
  },
});
