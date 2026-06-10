export { KeyboardAvoidingView } from "react-native";

// Web: React Native's built-in KeyboardAvoidingView (a no-op layout view on
// react-native-web — browsers manage the keyboard themselves). The .native pair
// swaps in react-native-keyboard-controller's WindowInsets-driven replacement:
// RN core's Android keyboard events are unreliable under Android 16
// edge-to-edge (zero lift on the Pixel 10, 16dp miss on the emulator).
