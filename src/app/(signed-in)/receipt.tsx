import Feather from "@expo/vector-icons/Feather";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { decodeFunctionData } from "viem";
import { usePublicClient } from "wagmi";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Avatar } from "@/design-system/primitives/Avatar";
import { ScreenContainer } from "@/design-system/primitives/ScreenContainer";
import { useTheme } from "@/design-system/theme";
import { radius, spacing, tint } from "@/design-system/tokens";
import { fonts } from "@/design-system/typography";
import { CONTRACTS } from "@/features/eerc/config/contracts";
import { transferAbi } from "@/features/eerc/transferAbi";
import { useEerc } from "@/features/eerc/useEerc";
import { formatSignedMoney } from "@/lib/money";

type Kind = "sent" | "received" | "deposit" | "withdraw";

const SNOWTRACE_TX = "https://testnet.snowtrace.io/tx/";
const SNOWTRACE_ADDR = "https://testnet.snowtrace.io/address/";

const shorten = (a: string) => `${a.slice(0, 8)}…${a.slice(-6)}`;
const open = (url: string) => {
  void Linking.openURL(url);
};

function titleLine(kind: Kind, name: string): string {
  if (kind === "deposit") return "Added money";
  if (kind === "withdraw") return "Cashed out";
  if (kind === "received") return `${name} paid you`;
  return `You paid ${name}`;
}

export default function Receipt() {
  const { colors } = useTheme();
  const eerc = useEerc();
  const publicClient = usePublicClient();
  const params = useLocalSearchParams<{
    txHash: string;
    kind: Kind;
    name?: string;
    address?: string;
    caption?: string;
    createdAt?: string;
  }>();
  const txHash = params.txHash ?? "";
  const kind = (params.kind ?? "sent") as Kind;
  const name = params.name ?? "";
  const isTransfer = kind === "sent" || kind === "received";
  const positive = kind === "received" || kind === "deposit";
  const [showProof, setShowProof] = useState(false);

  const amount = useQuery({
    queryKey: ["tx-amount", txHash],
    enabled: eerc.isDecryptionKeySet && Boolean(txHash),
    staleTime: Infinity,
    queryFn: () => eerc.decryptAmount(txHash, kind),
  });

  const memo = useQuery({
    queryKey: ["tx-memo", txHash],
    enabled:
      eerc.isDecryptionKeySet && isTransfer && !params.caption && Boolean(txHash),
    staleTime: Infinity,
    queryFn: () => eerc.decryptMemo(txHash),
  });
  const note = params.caption || memo.data || null;

  const proof = useQuery({
    queryKey: ["proof", txHash],
    enabled: isTransfer && Boolean(txHash) && Boolean(publicClient),
    staleTime: Infinity,
    queryFn: async () => {
      const tx = await publicClient!.getTransaction({ hash: txHash as `0x${string}` });
      const { args } = decodeFunctionData({ abi: transferAbi, data: tx.input });
      const p = args[2] as {
        proofPoints: {
          a: readonly bigint[];
          b: readonly (readonly bigint[])[];
          c: readonly bigint[];
        };
      };
      return [
        ...p.proofPoints.a,
        ...p.proofPoints.b.flat(),
        ...p.proofPoints.c,
      ].map((x) => x.toString());
    },
  });

  const isLocked = !eerc.isDecryptionKeySet;
  let amountText: string;
  if (amount.isPending) amountText = "···";
  else if (amount.data == null) amountText = "—";
  else amountText = formatSignedMoney(amount.data, positive);
  const amountColor =
    eerc.isDecryptionKeySet && amount.data != null
      ? positive
        ? colors.positive
        : colors.avRed
      : colors.sub;

  const date = params.createdAt
    ? new Date(params.createdAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";

  const fields: { label: string; value: string; mono?: boolean }[] = [
    { label: kind === "received" ? "From" : kind === "deposit" || kind === "withdraw" ? "Type" : "To", value: name || titleLine(kind, name) },
    ...(isTransfer && params.address
      ? [{ label: "Address", value: shorten(params.address), mono: true }]
      : []),
    ...(note ? [{ label: "Note", value: note }] : []),
    { label: "Date", value: date },
    { label: "Network", value: "Avalanche Fuji" },
  ];

  return (
    <ScreenContainer>
      <ScreenHeader title="Receipt" />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <Avatar name={name || "0 x"} size={62} />
          <Text style={[styles.title, { color: colors.sub }]}>{titleLine(kind, name)}</Text>
          {isLocked ? (
            <Feather name="lock" size={32} color={amountColor} style={styles.amountLock} />
          ) : (
            <Text style={[styles.amount, { color: amountColor }]}>{amountText}</Text>
          )}
          {isTransfer ? (
            <View style={[styles.chip, { backgroundColor: tint.blue }]}>
              <Feather name="lock" size={12} color={colors.actBlue} />
              <Text style={[styles.chipText, { color: colors.actBlue }]}>
                Private · Completed
              </Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.line }]}>
          {fields.map((f, i) => (
            <View
              key={f.label}
              style={[
                styles.row,
                i ? { borderTopWidth: 1, borderTopColor: colors.line } : null,
              ]}
            >
              <Text style={[styles.rowLabel, { color: colors.sub }]}>{f.label}</Text>
              <Text
                style={[styles.rowValue, f.mono && styles.mono, { color: colors.ink }]}
                numberOfLines={1}
              >
                {f.value}
              </Text>
            </View>
          ))}
          <Pressable
            onPress={() => open(`${SNOWTRACE_TX}${txHash}`)}
            style={[styles.row, { borderTopWidth: 1, borderTopColor: colors.line }]}
          >
            <Text style={[styles.rowLabel, { color: colors.sub }]}>Transaction</Text>
            <Text style={[styles.rowValue, styles.mono, { color: colors.actBlue }]} numberOfLines={1}>
              {shorten(txHash)} ↗
            </Text>
          </Pressable>
        </View>

        {isTransfer ? (
          <View style={[styles.proofCard, { backgroundColor: colors.chip }]}>
            <Pressable style={styles.proofHead} onPress={() => setShowProof((s) => !s)}>
              <View style={styles.proofTitleRow}>
                <Feather name="shield" size={13} color={colors.actBlue} />
                <Text style={[styles.proofTitle, { color: colors.ink }]}>
                  Amount encrypted on-chain
                </Text>
              </View>
              <Text style={[styles.proofToggle, { color: colors.actBlue }]}>
                {showProof ? "Hide proof" : "View proof"}
              </Text>
            </Pressable>
            {showProof ? (
              <View style={styles.proofBody}>
                <Text style={[styles.proofText, { color: colors.sub }]}>
                  Verified on-chain by a Groth16 zk-SNARK — the amount was proven valid
                  without ever being revealed.
                </Text>
                <Pressable onPress={() => open(`${SNOWTRACE_ADDR}${CONTRACTS.verifiers.transfer}`)}>
                  <Text style={[styles.proofLabel, { color: colors.sub }]}>Verifier</Text>
                  <Text style={[styles.proofMono, { color: colors.actBlue }]} numberOfLines={1}>
                    {shorten(CONTRACTS.verifiers.transfer)} ↗
                  </Text>
                </Pressable>
                <Text style={[styles.proofLabel, { color: colors.sub }]}>Proof (a · b · c)</Text>
                {proof.isPending ? (
                  <Text style={[styles.proofMono, { color: colors.sub }]}>Loading…</Text>
                ) : proof.data ? (
                  proof.data.map((p, i) => (
                    <Text key={i} style={[styles.proofMono, { color: colors.ink }]} numberOfLines={1}>
                      {p.slice(0, 14)}…{p.slice(-8)}
                    </Text>
                  ))
                ) : (
                  <Text style={[styles.proofMono, { color: colors.sub }]}>Unavailable</Text>
                )}
              </View>
            ) : null}
          </View>
        ) : (
          <Pressable
            onPress={() => open(`${SNOWTRACE_TX}${txHash}`)}
            style={[styles.proofCard, { backgroundColor: colors.chip }]}
          >
            <View style={styles.proofHead}>
              <Text style={[styles.proofTitle, { color: colors.ink }]}>Public on-chain</Text>
              <Text style={[styles.proofToggle, { color: colors.actBlue }]}>
                View on Snowtrace ↗
              </Text>
            </View>
          </Pressable>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: "center", marginTop: spacing.lg, gap: 6 },
  title: { fontFamily: fonts.ui, fontSize: 14, marginTop: 6 },
  amount: { fontFamily: fonts.display, fontSize: 40, fontWeight: "800" },
  amountLock: { marginVertical: 4 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.pill,
    marginTop: 4,
  },
  chipText: { fontFamily: fonts.ui, fontSize: 12.5, fontWeight: "600" },
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 18,
    marginTop: spacing.xl,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 13,
  },
  rowLabel: { fontFamily: fonts.ui, fontSize: 13.5, flexShrink: 0 },
  rowValue: { fontFamily: fonts.ui, fontSize: 13.5, fontWeight: "600", flexShrink: 1, textAlign: "right" },
  mono: { fontFamily: fonts.mono, fontSize: 12.5 },
  proofCard: { borderRadius: radius.card, padding: 16, marginTop: spacing.md, marginBottom: spacing.xl },
  proofHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  proofTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 },
  proofTitle: { fontFamily: fonts.ui, fontSize: 13, fontWeight: "600", flexShrink: 1 },
  proofToggle: { fontFamily: fonts.ui, fontSize: 12.5, fontWeight: "600" },
  proofBody: { marginTop: spacing.md, gap: 6 },
  proofText: { fontFamily: fonts.ui, fontSize: 12.5, lineHeight: 18 },
  proofLabel: { fontFamily: fonts.ui, fontSize: 11.5, fontWeight: "600", marginTop: spacing.sm },
  proofMono: { fontFamily: fonts.mono, fontSize: 11.5 },
});
