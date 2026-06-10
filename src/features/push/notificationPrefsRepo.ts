import type { SocialPrefs } from "@/features/notifications/socialPrefs";
import { supabase } from "@/features/supabase/client";

// Server mirror of the social-notification prefs: the push sender reads these
// to gate likes/comments/mentions banners. The local store stays the source for
// the in-app inbox (unchanged); this mirror is best-effort and per-account, so
// toggling on any device governs pushes to all of that account's devices.
export const notificationPrefsRepo = {
  async upsert(address: string, prefs: SocialPrefs): Promise<void> {
    const { error } = await supabase.from("notification_prefs").upsert(
      {
        address: address.toLowerCase(),
        likes: prefs.likes,
        comments: prefs.comments,
        mentions: prefs.mentions,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "address" },
    );
    if (error) throw new Error(`prefs sync failed: ${error.message}`);
  },
};
