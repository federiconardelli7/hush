import { useQuery } from "@tanstack/react-query";
import { contactsRepo } from "@/features/contacts/contactsRepo";
import { profilesRepo } from "@/features/profile/profilesRepo";
import type { Profile } from "@/features/profile/schema";

export type ContactItem = {
  contact_address: string;
  nickname: string;
  created_at: string;
  profile: Profile | null;
};

// The current wallet's contacts, joined with each contact's public profile
// (for the @username). Mirrors useActivity.
export function useContacts(me: string | undefined) {
  return useQuery({
    queryKey: ["contacts", me],
    enabled: Boolean(me),
    queryFn: async (): Promise<ContactItem[]> => {
      const contacts = await contactsRepo.mine(me!);
      const profiles = await profilesRepo.listByAddresses(
        contacts.map((c) => c.contact_address),
      );
      return contacts.map((c) => ({
        contact_address: c.contact_address,
        nickname: c.nickname,
        created_at: c.created_at,
        profile: profiles[c.contact_address] ?? null,
      }));
    },
  });
}
