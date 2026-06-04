import { z } from "zod";
import { supabase } from "@/features/supabase/client";

const addSchema = z.object({
  owner_address: z.string(),
  contact_address: z.string(),
  nickname: z.string().trim().min(1, "Add a name.").max(40, "Name is too long."),
});
export type AddContactInput = z.infer<typeof addSchema>;

// A private nickname for a wallet. Owner-only via RLS (`contacts_all`); the
// address is never shown in the feed, only the nickname.
export type Contact = {
  owner_address: string;
  contact_address: string;
  nickname: string;
  created_at: string;
};

const COLUMNS = "owner_address, contact_address, nickname, created_at";

export const contactsRepo = {
  async add(input: AddContactInput): Promise<Contact> {
    const c = addSchema.parse(input);
    const row = {
      owner_address: c.owner_address.toLowerCase(),
      contact_address: c.contact_address.toLowerCase(),
      nickname: c.nickname,
    };
    const { data, error } = await supabase
      .from("contacts")
      .upsert(row, { onConflict: "owner_address,contact_address" })
      .select(COLUMNS)
      .single();
    if (error) {
      throw new Error(error.message);
    }
    return data as Contact;
  },

  async remove(owner: string, contact: string): Promise<void> {
    const { error } = await supabase
      .from("contacts")
      .delete()
      .eq("owner_address", owner.toLowerCase())
      .eq("contact_address", contact.toLowerCase());
    if (error) {
      throw new Error(error.message);
    }
  },

  // The current wallet's saved contacts (owner-only via RLS), newest first.
  async mine(owner: string): Promise<Contact[]> {
    const { data, error } = await supabase
      .from("contacts")
      .select(COLUMNS)
      .eq("owner_address", owner.toLowerCase())
      .order("created_at", { ascending: false });
    if (error) {
      throw new Error(error.message);
    }
    return (data ?? []) as Contact[];
  },
};
