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

// Native only (@privy-io/expo + viem/snarkjs): TextEncoder/atob/FileReader/nextTick
// shims that Hermes lacks. No-ops on web (the browser already has these); gated on
// the absence of `document` so the web bundle stays byte-for-byte unchanged.
if (typeof document === "undefined") {
  require("fast-text-encoding");
  require("@ethersproject/shims");

  // ffjavascript (snarkjs's field math) builds an *unused* Web-Worker Blob from a
  // Uint8Array at import time; React Native's Blob rejects ArrayBuffer(View) parts and
  // throws, crashing the app at launch. On Hermes there's no Worker, so proving runs
  // single-threaded and that Blob is never used — so tolerate it: substitute empty
  // strings for ArrayBuffer(View) parts instead of throwing. Hush has no native flow
  // that builds a Blob from binary, so nothing real is affected.
  if (typeof global.Blob === "function") {
    const NativeBlob = global.Blob;
    function PatchedBlob(parts, options) {
      const safeParts = Array.isArray(parts)
        ? parts.map((part) =>
            part instanceof ArrayBuffer || ArrayBuffer.isView(part) ? "" : part,
          )
        : parts;
      return new NativeBlob(safeParts, options);
    }
    PatchedBlob.prototype = NativeBlob.prototype;
    global.Blob = PatchedBlob;
  }

  // ...ffjavascript then calls URL.createObjectURL(workerBlob) (threadman.js:48).
  // RN ships a real createObjectURL, but it throws on this app: getBlobUrlPrefix
  // needs the native BlobModule's BLOB_URI_SCHEME constant, which isn't wired up
  // here. The worker URL is never used on Hermes (single-threaded proving), so
  // no-op both methods unconditionally on native.
  if (global.URL) {
    global.URL.createObjectURL = () => "";
    global.URL.revokeObjectURL = () => {};
  }
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
