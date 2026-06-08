import Feather from "@expo/vector-icons/Feather";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { MentionText } from "@/components/MentionText";
import { ReactionPicker } from "@/components/ReactionPicker";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Avatar } from "@/design-system/primitives/Avatar";
import { Button } from "@/design-system/primitives/Button";
import { EmptyState } from "@/design-system/primitives/EmptyState";
import { ScreenContainer } from "@/design-system/primitives/ScreenContainer";
import { useTheme } from "@/design-system/theme";
import { radius, spacing } from "@/design-system/tokens";
import { fonts } from "@/design-system/typography";
import { useEerc } from "@/features/eerc/useEerc";
import { profilesRepo } from "@/features/profile/profilesRepo";
import { commentsRepo } from "@/features/social/commentsRepo";
import { usePaymentThread, type ThreadComment } from "@/features/social/usePaymentThread";
import { parseMentionUsernames } from "@/lib/mentions";
import { displayName } from "@/lib/identity";

function timeAgo(iso: string): string {
  const secs = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

function CommentRow({
  c,
  me,
  onDelete,
}: {
  c: ThreadComment;
  me: string | undefined;
  onDelete: (id: string) => void;
}) {
  const { colors } = useTheme();
  const name = displayName(c.author, c.author_address);
  const mine = Boolean(me) && c.author_address === me;
  return (
    <View style={styles.commentRow}>
      <Avatar name={name} size={34} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.commentHead}>
          <Text style={[styles.commentName, { color: colors.ink }]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.commentTime, { color: colors.sub }]}>
            {timeAgo(c.created_at)}
          </Text>
        </View>
        <MentionText
          style={[styles.commentText, { color: colors.ink }]}
          body={c.body}
          resolved={new Set(c.mentionUsernames)}
        />
      </View>
      {mine ? (
        <Pressable onPress={() => onDelete(c.id)} hitSlop={8} style={styles.del}>
          <Feather name="trash-2" size={15} color={colors.sub} />
        </Pressable>
      ) : null}
    </View>
  );
}

// The public social thread for one payment: header (who paid whom — never the amount),
// reactions (pick-one emoji), and the comment list + composer (with @mention typeahead).
// Reached from any feed row's comment pill, and for non-party rows by tapping the row.
// Parties get a "View receipt" link to the amount/proof. All reads/writes are RLS-gated by
// payment visibility, so a non-mutual user can't open or post here.
export default function PaymentThread() {
  const { colors } = useTheme();
  const { address } = useEerc();
  const me = address?.toLowerCase();
  const queryClient = useQueryClient();
  const p = useLocalSearchParams<{
    txHash: string;
    senderName?: string;
    senderAddress?: string;
    receiverName?: string;
    receiverAddress?: string;
    caption?: string;
    createdAt?: string;
  }>();
  const txHash = p.txHash ?? "";
  const senderName = p.senderName ?? "";
  const receiverName = p.receiverName ?? "";
  const isParty =
    Boolean(me) && (p.senderAddress === me || p.receiverAddress === me);

  const thread = usePaymentThread(txHash, me);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // @mention typeahead: the partial username being typed at the end of the input (after
  // start-or-whitespace), and a prefix search for it (reusing the Pay picker's search).
  const activeMention = /(?:^|\s)@([a-zA-Z0-9_]{1,30})$/.exec(body);
  const mentionQuery = activeMention ? activeMention[1] : null;
  const suggestions = useQuery({
    queryKey: ["mention-search", mentionQuery?.toLowerCase()],
    enabled: Boolean(mentionQuery),
    staleTime: 30_000,
    queryFn: () => profilesRepo.searchByUsername(mentionQuery!),
  });
  const matches = (suggestions.data ?? []).filter((pf) => pf.address !== me).slice(0, 6);

  const applyMention = (username: string) => {
    setBody((b) => b.replace(/@[a-zA-Z0-9_]{0,30}$/, `@${username} `));
  };

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["thread", txHash] }),
      queryClient.invalidateQueries({ queryKey: ["feed-social"] }),
    ]);

  const submit = async () => {
    const text = body.trim();
    if (!me || busy || text.length === 0) return;
    setError(null);
    setBusy(true);
    try {
      // Resolve @usernames → addresses so the mentioned users can be notified (only if
      // they can see this payment — enforced by RLS on the mention lookup).
      const usernames = parseMentionUsernames(text);
      const mentioned = usernames.length
        ? Object.values(await profilesRepo.listByUsernames(usernames))
            .map((profile) => profile.address)
            .filter((a) => a !== me)
        : [];
      await commentsRepo.add(txHash, me, text, mentioned);
      setBody("");
      await invalidate();
    } catch {
      setError("Couldn't post your comment. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const removeComment = async (id: string) => {
    try {
      await commentsRepo.remove(id);
      await invalidate();
    } catch {
      setError("Couldn't delete the comment. Please try again.");
    }
  };

  const viewReceipt = () => {
    const kind = p.senderAddress === me ? "sent" : "received";
    const name = kind === "sent" ? receiverName : senderName;
    const addr = kind === "sent" ? (p.receiverAddress ?? "") : (p.senderAddress ?? "");
    router.push({
      pathname: "/receipt",
      params: {
        txHash,
        kind,
        name,
        address: addr,
        caption: p.caption ?? "",
        createdAt: p.createdAt ?? "",
      },
    });
  };

  const data = thread.data;
  const reactionCount = data?.reactionCount ?? 0;
  const dateText = p.createdAt
    ? new Date(p.createdAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "";

  const header = (
    <View>
      <View style={[styles.head, { backgroundColor: colors.card }]}>
        <View style={styles.headRow}>
          <Avatar name={senderName || "0 x"} size={42} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.headLine, { color: colors.ink }]}>
              <Text style={styles.bold}>{senderName}</Text>
              <Text style={{ color: colors.sub }}> paid </Text>
              <Text style={styles.bold}>{receiverName}</Text>
            </Text>
            {dateText ? (
              <Text style={[styles.headDate, { color: colors.sub }]}>{dateText}</Text>
            ) : null}
          </View>
          <View style={[styles.chip, { backgroundColor: colors.chip }]}>
            <Feather name="lock" size={11} color={colors.sub} />
            <Text style={[styles.chipText, { color: colors.sub }]}>Hidden</Text>
          </View>
        </View>
        {p.caption ? (
          <Text style={[styles.caption, { color: colors.ink }]}>{p.caption}</Text>
        ) : null}
        <View style={[styles.reactRow, { borderTopColor: colors.line }]}>
          <ReactionPicker txHash={txHash} myEmoji={data?.myEmoji ?? null} me={me} />
          <Text style={[styles.reactText, { color: colors.sub }]}>
            {reactionCount === 0
              ? "Be the first to react"
              : `${reactionCount} ${reactionCount === 1 ? "reaction" : "reactions"}`}
          </Text>
        </View>
      </View>
      {isParty ? (
        <Button
          label="View receipt"
          variant="secondary"
          onPress={viewReceipt}
          style={styles.receiptBtn}
        />
      ) : null}
      <Text style={[styles.commentsLabel, { color: colors.sub }]}>Comments</Text>
    </View>
  );

  return (
    <ScreenContainer>
      <ScreenHeader title="Post" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <FlatList
          style={styles.flex}
          data={data?.comments ?? []}
          keyExtractor={(c) => c.id}
          ListHeaderComponent={header}
          renderItem={({ item }) => (
            <CommentRow c={item} me={me} onDelete={removeComment} />
          )}
          ListEmptyComponent={
            thread.isLoading ? null : (
              <EmptyState
                icon="message-circle"
                title="No comments yet"
                subtitle="Be the first to say something."
              />
            )
          }
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
        />
        {error ? (
          <Text style={[styles.composerError, { color: colors.avRed }]}>{error}</Text>
        ) : null}
        {mentionQuery && matches.length > 0 ? (
          <View style={[styles.suggest, { backgroundColor: colors.card, borderColor: colors.line }]}>
            {matches.map((pf) => (
              <Pressable
                key={pf.address}
                onPress={() => applyMention(pf.username)}
                style={styles.suggestRow}
              >
                <Avatar name={pf.display_name} size={28} tint={pf.avatar_tint ?? undefined} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.suggestName, { color: colors.ink }]} numberOfLines={1}>
                    {pf.display_name}
                  </Text>
                  <Text style={[styles.suggestHandle, { color: colors.sub }]} numberOfLines={1}>
                    @{pf.username}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}
        <View
          style={[styles.composer, { borderTopColor: colors.line, backgroundColor: colors.bg }]}
        >
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Add a comment…  use @name to mention"
            placeholderTextColor={colors.sub}
            maxLength={500}
            multiline
            style={[
              styles.input,
              { backgroundColor: colors.card, color: colors.ink, borderColor: colors.line },
            ]}
          />
          <Pressable
            onPress={submit}
            disabled={busy || body.trim().length === 0}
            hitSlop={6}
            style={styles.send}
          >
            <Feather
              name="send"
              size={20}
              color={body.trim().length === 0 ? colors.sub : colors.actBlue}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { paddingBottom: spacing.lg },
  head: { borderRadius: radius.card, padding: 16, marginTop: spacing.sm },
  headRow: { flexDirection: "row", alignItems: "center", gap: 13 },
  headLine: { fontFamily: fonts.ui, fontSize: 14.5 },
  bold: { fontWeight: "700" },
  headDate: { fontFamily: fonts.ui, fontSize: 12, marginTop: 1 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  chipText: { fontFamily: fonts.ui, fontSize: 11, fontWeight: "600" },
  caption: { fontFamily: fonts.ui, fontSize: 14, marginTop: 11 },
  reactRow: { marginTop: 13, paddingTop: 12, borderTopWidth: 1, gap: 10 },
  reactText: { fontFamily: fonts.ui, fontSize: 13, fontWeight: "600" },
  receiptBtn: { marginTop: spacing.md },
  commentsLabel: {
    fontFamily: fonts.ui,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  commentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
    paddingVertical: 10,
  },
  commentHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  commentName: { fontFamily: fonts.ui, fontSize: 13.5, fontWeight: "700", flexShrink: 1 },
  commentTime: { fontFamily: fonts.ui, fontSize: 11.5 },
  commentText: { fontFamily: fonts.ui, fontSize: 14, marginTop: 2, lineHeight: 19 },
  del: { paddingTop: 2 },
  composerError: { fontFamily: fonts.ui, fontSize: 12.5, marginBottom: spacing.sm },
  suggest: {
    borderRadius: radius.card,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: spacing.sm,
  },
  suggestRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10 },
  suggestName: { fontFamily: fonts.ui, fontSize: 14, fontWeight: "600" },
  suggestHandle: { fontFamily: fonts.mono, fontSize: 12, marginTop: 1 },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    fontFamily: fonts.ui,
    fontSize: 14.5,
    maxHeight: 110,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: radius.input,
    borderWidth: 1,
  },
  send: { paddingBottom: 11 },
});
