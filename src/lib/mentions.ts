// @mention parsing. Usernames are [a-z0-9_]{1,30} (the profiles username space). Returns
// lowercased, de-duplicated usernames (without the leading @) for resolution.
const MENTION_RE = /@([a-zA-Z0-9_]{1,30})/g;

export function parseMentionUsernames(body: string): string[] {
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = MENTION_RE.exec(body)) !== null) {
    out.add(m[1].toLowerCase());
  }
  MENTION_RE.lastIndex = 0;
  return [...out];
}
