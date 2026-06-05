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

// Web only: react-native-web renders TextInput as a real <input>/<textarea>, so
// focused fields show the browser's default outline — a hard rectangle inside our
// rounded inputs. Strip it app-wide. (Text inputs always count as :focus-visible,
// so this can't be scoped to keyboard focus; fields keep their own borders as the
// focus cue, and the Activity search box additionally highlights its border.)
if (typeof document !== "undefined" && document.head) {
  const inputFocusReset = document.createElement("style");
  inputFocusReset.textContent = "input:focus,textarea:focus{outline:none;}";
  document.head.appendChild(inputFocusReset);
}
