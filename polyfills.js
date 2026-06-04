// Web3 polyfills — must evaluate before expo-router/entry (see index.js).
// viem/snarkjs expect Buffer/process globals and a crypto RNG.
import "react-native-get-random-values";
import { Buffer } from "buffer";
import process from "process";

if (typeof global.Buffer === "undefined") {
  global.Buffer = Buffer;
}
if (typeof global.process === "undefined") {
  global.process = process;
}

// Silence one benign dev warning: Privy's styled-components UI passes an `isActive`
// prop to a DOM element, which React flags. It's internal to Privy (we never pass
// `isActive`), harmless, and not fixable without a Privy patch — so drop just that
// one message and let everything else through (see ARCHITECTURE F-6).
const originalConsoleError = console.error;
console.error = (...args) => {
  const text = args.map((a) => (typeof a === "string" ? a : "")).join(" ");
  if (text.includes("does not recognize the") && text.includes("isActive")) {
    return;
  }
  originalConsoleError(...args);
};
