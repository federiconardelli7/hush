import type { ReactNode } from "react";
import { KeyboardStickyView } from "react-native-keyboard-controller";

// Native: translates children by the LIVE native keyboard height signal —
// no screen-dimension math. Chosen over the library's KeyboardAvoidingView,
// whose geometry seeds from RN's Dimensions.get("window") (device-inconsistent:
// ~64dp short on the Pixel 10 under Android 16 edge-to-edge, correct on the
// emulator — measured 2026-06-10). Requires KeyboardProviderCompat at the root.
export function KeyboardSticky({
  children,
  offset,
}: {
  children: ReactNode;
  offset?: { closed?: number; opened?: number };
}) {
  return (
    <KeyboardStickyView offset={{ closed: offset?.closed ?? 0, opened: offset?.opened ?? 0 }}>
      {children}
    </KeyboardStickyView>
  );
}
