import { useEffect, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { buildProverPage } from "@/features/eerc/prover/proverPage";
import {
  deliverResult,
  failInFlight,
  markProverNotReady,
  markProverReady,
  registerProverHost,
  unregisterProverHost,
  type ProverJob,
} from "@/features/eerc/prover/proverRegistry";

// Circuit fetches inside the page resolve against this origin (same-origin =>
// no CORS); must match the absolute circuit URLs in features/eerc/circuits.ts.
const PROVER_BASE_URL = "https://hush-rho-two.vercel.app";

// Invisible System-WebView that runs Groth16 proving for snarkjsBridge.native —
// stock Hermes ships without WebAssembly. Mounted once at the app root so the
// onboarding register proof works too. 1x1 (not 0x0): some Android WebView
// versions throttle zero-sized views.
export function ProverHost() {
  const webRef = useRef<WebView>(null);
  const html = useMemo(() => buildProverPage(), []);

  useEffect(() => {
    registerProverHost((job: ProverJob) => {
      // Double-stringify: the outer JSON.stringify turns the job's JSON text
      // into a quoted JS string literal, so the page parses it losslessly.
      // U+2028/U+2029 are valid in JSON but terminate string literals on
      // pre-ES2019 engines — escape them so the injected source stays inert.
      const encoded = JSON.stringify(JSON.stringify(job))
        .replace(/\u2028/g, "\\u2028")
        .replace(/\u2029/g, "\\u2029");
      webRef.current?.injectJavaScript(
        `window.__hushProver.run(JSON.parse(${encoded})); true;`,
      );
    });
    return () => unregisterProverHost();
  }, []);

  const onMessage = (event: WebViewMessageEvent) => {
    let msg: { type?: string; id?: number; ok?: boolean; result?: unknown; error?: string };
    try {
      msg = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.type === "ready") {
      markProverReady();
      return;
    }
    if (typeof msg.id === "number") {
      deliverResult({ id: msg.id, ok: msg.ok === true, result: msg.result, error: msg.error });
    }
  };

  const recover = (why: string) => {
    markProverNotReady();
    failInFlight(new Error(`Proof generation failed (${why}) — please try again.`));
    webRef.current?.reload();
  };

  return (
    <View style={styles.hidden} pointerEvents="none">
      <WebView
        ref={webRef}
        source={{ html, baseUrl: PROVER_BASE_URL }}
        // The page holds the live witness: pin it in place. Only the initial
        // html load (baseUrl / about:blank) may load; any other top-frame
        // navigation is refused. Circuit fetches are sub-resources, unaffected.
        originWhitelist={[PROVER_BASE_URL, "about:blank"]}
        onShouldStartLoadWithRequest={(req) =>
          req.url.startsWith(PROVER_BASE_URL) || req.url.startsWith("about:")
        }
        javaScriptEnabled
        domStorageEnabled={false}
        onMessage={onMessage}
        onError={() => recover("page error")}
        onRenderProcessGone={() => recover("renderer crashed")}
        onContentProcessDidTerminate={() => recover("content process terminated")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
    overflow: "hidden",
  },
});
