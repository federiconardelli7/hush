import { supabase } from "@/features/supabase/client";

// Device push tokens (one row per device). RLS scopes every operation to the
// signed-in wallet's own rows; the server-side sender reads them via the
// service role.
export const pushTokensRepo = {
  async upsert(token: string, address: string, platform: "android" | "ios"): Promise<void> {
    const { error } = await supabase.from("push_tokens").upsert(
      {
        token,
        address: address.toLowerCase(),
        platform,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "token" },
    );
    if (error) throw new Error(`push token save failed: ${error.message}`);
  },
  async remove(token: string): Promise<void> {
    const { error } = await supabase.from("push_tokens").delete().eq("token", token);
    if (error) throw new Error(`push token delete failed: ${error.message}`);
  },
};
