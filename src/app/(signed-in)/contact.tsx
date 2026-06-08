import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Avatar } from "@/design-system/primitives/Avatar";
import { Button } from "@/design-system/primitives/Button";
import { ScreenContainer } from "@/design-system/primitives/ScreenContainer";
import { useTheme } from "@/design-system/theme";
import { radius, spacing } from "@/design-system/tokens";
import { fonts } from "@/design-system/typography";
import { contactsRepo } from "@/features/contacts/contactsRepo";
import { useEerc } from "@/features/eerc/useEerc";
import { paymentsRepo } from "@/features/payments/paymentsRepo";
import { profilesRepo } from "@/features/profile/profilesRepo";

function shortDate(iso: string, withYear = false): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(withYear ? { year: "numeric" } : {}),
  });
}

export default function Contact() {
  const { colors } = useTheme();
  const { address, nickname } = useLocalSearchParams<{
    address: string;
    nickname: string;
  }>();
  const { address: myAddress } = useEerc();
  const me = myAddress?.toLowerCase();
  const contactAddress = (address ?? "").toLowerCase();
  const queryClient = useQueryClient();
  const [revealed, setRevealed] = useState(false);
  const [mode, setMode] = useState<"pay" | "request">("pay");

  const profile = useQuery({
    queryKey: ["profile", contactAddress],
    enabled: Boolean(contactAddress),
    queryFn: () => profilesRepo.getByAddress(contactAddress),
  });

  const history = useQuery({
    queryKey: ["between", me, contactAddress],
    enabled: Boolean(me && contactAddress),
    queryFn: () => paymentsRepo.between(me!, contactAddress),
  });

  const payments = history.data ?? [];
  const since = payments.length > 0 ? payments[payments.length - 1].created_at : null;

  const remove = async () => {
    if (!me) return;
    try {
      await contactsRepo.remove(me, contactAddress);
      await queryClient.invalidateQueries({ queryKey: ["contacts"] });
      router.back();
    } catch {
      // ignore — surfaced by the ErrorBoundary if it throws synchronously
    }
  };

  return (
    <ScreenContainer>
      <ScreenHeader title={nickname ?? "Contact"} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <Avatar name={nickname ?? "0 x"} size={68} />
          <Text style={[styles.name, { color: colors.ink }]}>{nickname}</Text>
          {profile.data ? (
            <Text style={[styles.handle, { color: colors.sub }]}>
              @{profile.data.username}
            </Text>
          ) : null}
          <Pressable
            onPress={() => setRevealed((r) => !r)}
            style={[styles.addrChip, { backgroundColor: colors.chip }]}
          >
            <Text style={[styles.addr, { color: colors.sub }]} selectable={revealed}>
              {revealed
                ? contactAddress
                : `${contactAddress.slice(0, 6)}…${contactAddress.slice(-4)}`}
            </Text>
            <Text style={[styles.reveal, { color: colors.actBlue }]}>
              {revealed ? "Hide" : "Reveal"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.modeRow}>
          {([false, true] as const).map((req) => {
            const on = req === (mode === "request");
            return (
              <Pressable
                key={req ? "request" : "pay"}
                onPress={() => setMode(req ? "request" : "pay")}
                style={[styles.modeSeg, { backgroundColor: on ? colors.ink : colors.chip }]}
              >
                <Text style={[styles.modeSegText, { color: on ? colors.bg : colors.sub }]}>
                  {req ? "Request" : "Pay"}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Button
          label={
            mode === "request"
              ? `Request from ${nickname ?? ""}`.trim()
              : `Pay ${nickname ?? ""}`.trim()
          }
          variant="primary"
          onPress={() =>
            router.push({
              pathname: mode === "request" ? "/request-amount" : "/pay-amount",
              params: { to: contactAddress, name: nickname },
            })
          }
          style={styles.pay}
        />

        {payments.length > 0 ? (
          <View style={[styles.sinceCard, { backgroundColor: colors.card, borderColor: colors.line }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sinceTitle, { color: colors.ink }]}>
                Friends since {since ? shortDate(since, true) : "—"}
              </Text>
              <Text style={[styles.sinceSub, { color: colors.sub }]}>
                Amounts are visible only in Activity
              </Text>
            </View>
            <View style={styles.count}>
              <Text style={[styles.countNum, { color: colors.ink }]}>{payments.length}</Text>
              <Text style={[styles.countLabel, { color: colors.sub }]}>payments</Text>
            </View>
          </View>
        ) : null}

        <Text style={[styles.section, { color: colors.sub }]}>Between you two</Text>
        {payments.length === 0 ? (
          <Text style={[styles.empty, { color: colors.sub }]}>
            {history.isLoading ? "Loading…" : "No payments yet."}
          </Text>
        ) : (
          <View style={[styles.histCard, { backgroundColor: colors.card }]}>
            {payments.map((p, i) => {
              const sent = p.sender_address === me;
              return (
                <View
                  key={p.tx_hash}
                  style={[
                    styles.histRow,
                    i ? { borderTopWidth: 1, borderTopColor: colors.line } : null,
                  ]}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.histTitle, { color: colors.ink }]} numberOfLines={1}>
                      {sent ? `You paid ${nickname}` : `${nickname} paid you`}
                    </Text>
                    {p.caption ? (
                      <Text style={[styles.histNote, { color: colors.sub }]} numberOfLines={1}>
                        {p.caption}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.histRight}>
                    <Text
                      style={[styles.masked, { color: sent ? colors.avRed : colors.positive }]}
                    >
                      •••••
                    </Text>
                    <Text style={[styles.histDate, { color: colors.sub }]}>
                      {shortDate(p.created_at)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <Pressable onPress={remove}>
          <Text style={[styles.remove, { color: colors.avRed }]}>Remove contact</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: "center", marginTop: spacing.sm, gap: 4 },
  name: { fontFamily: fonts.ui, fontSize: 20, fontWeight: "700", marginTop: 6 },
  handle: { fontFamily: fonts.mono, fontSize: 13 },
  addrChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    marginTop: 8,
  },
  addr: { fontFamily: fonts.mono, fontSize: 11.5 },
  reveal: { fontFamily: fonts.ui, fontSize: 11.5, fontWeight: "600" },
  modeRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  modeSeg: { flex: 1, paddingVertical: 11, borderRadius: radius.pill, alignItems: "center" },
  modeSegText: { fontFamily: fonts.ui, fontSize: 14, fontWeight: "700" },
  pay: { marginTop: spacing.sm },
  sinceCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: 14,
    borderRadius: radius.card,
    borderWidth: 1,
    marginTop: spacing.lg,
  },
  sinceTitle: { fontFamily: fonts.ui, fontSize: 13.5, fontWeight: "600" },
  sinceSub: { fontFamily: fonts.ui, fontSize: 11.5, marginTop: 2 },
  count: { alignItems: "flex-end" },
  countNum: { fontFamily: fonts.ui, fontSize: 16, fontWeight: "700" },
  countLabel: { fontFamily: fonts.ui, fontSize: 10.5 },
  section: { fontFamily: fonts.ui, fontSize: 13, fontWeight: "600", marginTop: spacing.lg, marginBottom: spacing.sm },
  empty: { fontFamily: fonts.ui, fontSize: 14, textAlign: "center", marginTop: spacing.md },
  histCard: { borderRadius: radius.card, paddingHorizontal: 16 },
  histRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13 },
  histTitle: { fontFamily: fonts.ui, fontSize: 14, fontWeight: "600" },
  histNote: { fontFamily: fonts.ui, fontSize: 12, marginTop: 1 },
  histRight: { alignItems: "flex-end" },
  masked: { fontFamily: fonts.ui, fontSize: 14, fontWeight: "700", letterSpacing: 1 },
  histDate: { fontFamily: fonts.ui, fontSize: 10.5, marginTop: 1 },
  remove: { fontFamily: fonts.ui, fontSize: 14, fontWeight: "600", textAlign: "center", marginVertical: spacing.xl },
});
