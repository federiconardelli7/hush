import { resolveCircuitUrls } from "@/features/eerc/circuits";
import { SNARKJS_SRC } from "@/features/eerc/prover/snarkjsSource.gen";

// The page that runs inside ProverHost's WebView: the real snarkjs browser
// build (WASM is available there) plus a tiny job runner.
// RN -> page: ProverHost calls window.__hushProver.run(job) via injectJavaScript.
// Page -> RN: results and the boot signal go through
// window.ReactNativeWebView.postMessage as JSON strings.
export function buildProverPage(): string {
  const circuits = resolveCircuitUrls();
  // Only the proofs the app actually generates (register at onboarding,
  // transfer on send, withdraw on cash-out) — mint/burn circuits are unused.
  const prefetch = [circuits.register, circuits.transfer, circuits.withdraw].flatMap((pair) => [
    pair.wasm,
    pair.zkey,
  ]);
  const prefetchJson = JSON.stringify(prefetch).replace(/</g, "\\u003c");
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body>
<script>${SNARKJS_SRC}</script>
<script>
(function () {
  var post = function (msg) {
    window.ReactNativeWebView.postMessage(JSON.stringify(msg));
  };
  window.__hushProver = {
    run: function (job) {
      Promise.resolve()
        .then(function () {
          if (job.op === "fullProve") {
            return snarkjs.groth16.fullProve(
              job.payload.input,
              job.payload.wasmUrl,
              job.payload.zkeyUrl
            );
          }
          if (job.op === "calldata") {
            return snarkjs.groth16.exportSolidityCallData(
              job.payload.proof,
              job.payload.publicSignals
            );
          }
          throw new Error("Unknown prover op: " + job.op);
        })
        .then(function (result) {
          post({ id: job.id, ok: true, result: result });
        })
        .catch(function (err) {
          post({ id: job.id, ok: false, error: String((err && err.message) || err) });
        });
    }
  };
  post({ type: "ready" });
  // Warm the WebView's HTTP cache so a fresh install's first proof skips the
  // multi-MB circuit download (~60s observed). Sequential, register first
  // (onboarding proves before anything else); failures are ignored — proving
  // re-fetches on demand. Bodies must be consumed for the cache to store them.
  var PREFETCH = ${prefetchJson};
  (function warm(i) {
    if (i >= PREFETCH.length) {
      console.log("[hush-prover] circuit prefetch complete");
      return;
    }
    fetch(PREFETCH[i])
      .then(function (r) { return r.arrayBuffer(); })
      .catch(function () {})
      .then(function () { warm(i + 1); });
  })(0);
})();
</script>
</body>
</html>`;
}
