import { Fragment } from "react";
import { type StyleProp, Text, type TextStyle } from "react-native";
import { useTheme } from "@/design-system/theme";

// Splits on @username tokens, keeping the delimiters (capturing group). A non-global test
// regex classifies each chunk (a global regex's stateful lastIndex would misclassify).
const SPLIT = /(@[a-zA-Z0-9_]{1,30})/;
const isMention = (s: string) => /^@[a-zA-Z0-9_]{1,30}$/.test(s);

// Renders a comment body with @username tokens in the accent colour. Plain RN <Text>
// (auto-escaped); highlight only, no links for v1.
export function MentionText({ body, style }: { body: string; style?: StyleProp<TextStyle> }) {
  const { colors } = useTheme();
  const parts = body.split(SPLIT);
  return (
    <Text style={style}>
      {parts.map((part, i) =>
        isMention(part) ? (
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
