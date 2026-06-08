import { Fragment } from "react";
import { type StyleProp, Text, type TextStyle } from "react-native";
import { useTheme } from "@/design-system/theme";

// Splits on @username tokens, keeping the delimiters (capturing group). A non-global test
// regex classifies each chunk (a global regex's stateful lastIndex would misclassify).
const SPLIT = /(@[a-zA-Z0-9_]{1,30})/;
const isMention = (s: string) => /^@[a-zA-Z0-9_]{1,30}$/.test(s);

// Renders a comment body with @username tokens in the accent colour. Plain RN <Text>
// (auto-escaped); highlight only, no links for v1.
export function MentionText({
  body,
  style,
  resolved,
}: {
  body: string;
  style?: StyleProp<TextStyle>;
  resolved?: Set<string>;
}) {
  const { colors } = useTheme();
  const parts = body.split(SPLIT);
  // When `resolved` is supplied, only highlight @handles that actually resolved to a user
  // (a lowercased username set); without it, highlight every @token.
  const highlight = (part: string) =>
    isMention(part) && (resolved == null || resolved.has(part.slice(1).toLowerCase()));
  return (
    <Text style={style}>
      {parts.map((part, i) =>
        highlight(part) ? (
          <Text key={i} style={{ color: colors.actBlue, fontWeight: "600" }}>
            {part}
          </Text>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </Text>
  );
}
