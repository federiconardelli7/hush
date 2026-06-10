import type { ReactNode } from "react";
import { View } from "react-native";

// Web: no-op container — browsers scroll the focused input into view themselves.
// The .native pair translates children with the live keyboard via
// react-native-keyboard-controller's KeyboardStickyView.
export function KeyboardSticky({
  children,
}: {
  children: ReactNode;
  offset?: { closed?: number; opened?: number };
}) {
  return <View>{children}</View>;
}
