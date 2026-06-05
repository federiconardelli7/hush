import { useWindowDimensions } from "react-native";
import { layout } from "./tokens";

// True on desktop-width viewports (web). `useWindowDimensions` re-renders on browser
// resize, so screens and the nav switch live between mobile and desktop layouts.
export function useIsWide(): boolean {
  return useWindowDimensions().width >= layout.wide;
}
