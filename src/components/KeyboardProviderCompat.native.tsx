import type { ReactNode } from "react";
import { KeyboardProvider } from "react-native-keyboard-controller";

// Native: hosts react-native-keyboard-controller's window-insets listeners for
// every KeyboardAvoiding consumer below it. Mounted once in app/_layout.tsx.
// The translucent flags are required under Expo SDK 56's enforced edge-to-edge
// (app draws behind both bars): they default to false, and without them the
// native keyboard math is off by the bar insets (measured ~60dp on Android 16).
export function KeyboardProviderCompat({ children }: { children: ReactNode }) {
  return (
    <KeyboardProvider statusBarTranslucent navigationBarTranslucent preserveEdgeToEdge>
      {children}
    </KeyboardProvider>
  );
}
