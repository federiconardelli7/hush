import type { Profile } from "@/features/profile/schema";

// First name (or a shortened address fallback) for a counterparty shown in a
// payment row. Shared by the public feed and the private Activity list.
export function displayName(profile: Profile | null, address: string): string {
  if (profile?.display_name) return profile.display_name.split(" ")[0];
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
