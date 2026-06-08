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

  // Prefix search by @username, for the Pay recipient picker.
  async searchByUsername(query: string): Promise<Profile[]> {
    const q = query.trim().toLowerCase().replace(/[%_,]/g, "");
    if (!q) {
      return [];
    }
    const { data, error } = await supabase
      .from("profiles")
      .select(COLUMNS)
      .ilike("username", `${q}%`)
      .limit(10);
    if (error) {
      throw new Error(error.message);
    }
    return (data ?? []) as Profile[];
  },

  // Resolve many addresses to profiles at once (feed name lookup).
  async listByAddresses(addresses: string[]): Promise<Record<string, Profile>> {
    const lower = [...new Set(addresses.map((a) => a.toLowerCase()))];
    if (lower.length === 0) {
      return {};
    }
    const { data, error } = await supabase
      .from("profiles")
      .select(COLUMNS)
      .in("address", lower);
    if (error) {
      throw new Error(error.message);
    }
    const map: Record<string, Profile> = {};
    for (const profile of (data ?? []) as Profile[]) {
      map[profile.address] = profile;
    }
    return map;
  },

  // Resolve many @usernames to profiles at once (mention resolution). Username is unique.
  async listByUsernames(usernames: string[]): Promise<Record<string, Profile>> {
    const lower = [...new Set(usernames.map((u) => u.toLowerCase()))];
    if (lower.length === 0) {
      return {};
    }
    const { data, error } = await supabase
      .from("profiles")
      .select(COLUMNS)
      .in("username", lower);
    if (error) {
      throw new Error(error.message);
    }
    const map: Record<string, Profile> = {};
    for (const profile of (data ?? []) as Profile[]) {
      map[profile.username] = profile;
    }
    return map;
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
