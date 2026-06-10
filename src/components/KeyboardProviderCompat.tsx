import type { ReactNode } from "react";

// Web: react-native-keyboard-controller is native-only here, so the provider is
// a passthrough — keeps the web bundle free of the library entirely.
export function KeyboardProviderCompat({ children }: { children: ReactNode }) {
  return children;
}
