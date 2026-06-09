import { SNARKJS_SRC } from "@/features/eerc/prover/snarkjsSource.gen";

// The page that runs inside ProverHost's WebView: the real snarkjs browser
// build (WASM is available there) plus a tiny job runner.
// RN -> page: ProverHost calls window.__hushProver.run(job) via injectJavaScript.
// Page -> RN: results and the boot signal go through
// window.ReactNativeWebView.postMessage as JSON strings.
export function buildProverPage(): string {
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
})();
</script>
</body>
</html>`;
}
