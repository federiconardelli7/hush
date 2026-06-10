import type { ComponentProps } from "react";
import { KeyboardAvoidingView as ControllerAvoidingView } from "react-native-keyboard-controller";

// Native: drop-in KeyboardAvoidingView backed by the OS WindowInsets IME signal
// (react-native-keyboard-controller) instead of RN core's reconstructed keyboard
// events, which are unreliable under Android 16 edge-to-edge. Requires
// KeyboardProviderCompat mounted at the app root.
// `automaticOffset` is load-bearing: without it the library reuses onLayout's
// PARENT-relative frame for window-coordinate math (the same defect as RN
// core's component — measured ~60dp of composer left under the keyboard).
// With it, the frame is re-measured natively in window-absolute coordinates.
export function KeyboardAvoidingView(
  props: ComponentProps<typeof ControllerAvoidingView>,
) {
  return <ControllerAvoidingView automaticOffset {...props} />;
}
