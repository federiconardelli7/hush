import { useEerc } from "@/features/eerc/useEerc";
import { usePushRegistration } from "@/features/push/usePushRegistration";

// Invisible mount point for push registration — lives inside the signed-in
// shell (needs EercProvider for the wallet address). Platform behavior comes
// from usePushRegistration's web/native pair; on web this renders nothing and
// does nothing.
export function PushRegistrar() {
  const { address } = useEerc();
  usePushRegistration(address?.toLowerCase());
  return null;
}
