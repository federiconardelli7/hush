import { useQuery } from "@tanstack/react-query";
import { profilesRepo } from "@/features/profile/profilesRepo";

// The current wallet's profile (or null if it hasn't been set up yet).
export function useProfile(address: string | null) {
  return useQuery({
    queryKey: ["profile", address],
    queryFn: () => profilesRepo.getByAddress(address as string),
    enabled: Boolean(address),
  });
}
