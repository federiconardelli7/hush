import { supabase } from "@/features/supabase/client";
import {
  profileInputSchema,
  type Profile,
  type ProfileInput,
} from "@/features/profile/schema";

const COLUMNS = "address, username, display_name, avatar_tint, created_at";

// Typed access to the `profiles` table. Reads are public (RLS `using(true)`);
// writes require the wallet's Supabase token (RLS checks address = current_wallet()).
export const profilesRepo = {
  async getByAddress(address: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select(COLUMNS)
      .eq("address", address.toLowerCase())
      .maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    return (data as Profile | null) ?? null;
  },

  // True if no one owns the username, or the current wallet already does.
  async isUsernameAvailable(username: string, selfAddress?: string): Promise<boolean> {
    const { data, error } = await supabase
      .from("profiles")
      .select("address")
      .eq("username", username.toLowerCase())
      .maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    if (!data) {
      return true;
    }
    return selfAddress
      ? (data as { address: string }).address === selfAddress.toLowerCase()
      : false;
  },

  async upsert(input: ProfileInput): Promise<Profile> {
    const parsed = profileInputSchema.parse(input);
    const row = {
      ...parsed,
      address: parsed.address.toLowerCase(),
      username: parsed.username.toLowerCase(),
    };
    const { data, error } = await supabase
      .from("profiles")
      .upsert(row, { onConflict: "address" })
      .select(COLUMNS)
      .single();
    if (error) {
      throw new Error(error.message);
    }
    return data as Profile;
  },
};
