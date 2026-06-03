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
