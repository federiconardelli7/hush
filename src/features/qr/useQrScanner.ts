import { useEffect, useRef, useState } from "react";
import { Platform, type View } from "react-native";

export type QrScanError = "insecure" | "denied" | "nocamera" | "unsupported";
export type QrScanStatus = "idle" | "starting" | "scanning";

// Web-only continuous QR scanner built on @zxing/browser. Safe to call on native (the
// effect no-ops and @zxing is never imported). On web it mounts a <video> into the
// View the returned ref is attached to and reports every decode via onResult. Camera
// APIs need a secure context, so http-over-LAN-IP surfaces as "insecure" and the
// caller can fall back to manual entry.
export function useQrScanner(active: boolean, onResult: (text: string) => void) {
  const containerRef = useRef<View | null>(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;
  const [status, setStatus] = useState<QrScanStatus>("idle");
  const [error, setError] = useState<QrScanError | null>(null);

  useEffect(() => {
    if (Platform.OS !== "web" || !active) {
      return;
    }
    if (typeof window === "undefined" || !window.isSecureContext) {
      setError("insecure");
      return;
    }
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("unsupported");
      return;
    }
    const host = containerRef.current as unknown as HTMLElement | null;
    if (!host) {
      return;
    }

    let cancelled = false;
    let controls: { stop: () => void } | null = null;
    const video = document.createElement("video");
    video.setAttribute("playsinline", "true");
    video.muted = true;
    video.style.width = "100%";
    video.style.height = "100%";
    video.style.objectFit = "cover";
    host.appendChild(video);
    setStatus("starting");
    setError(null);

    void (async () => {
      try {
        const { BrowserQRCodeReader } = await import("@zxing/browser");
        if (cancelled) {
          return;
        }
        const reader = new BrowserQRCodeReader();
        // Prefer the rear camera on phones — the browser default is the front/
        // selfie cam, useless for scanning someone else's code. `ideal` (not
        // `exact`) so a device with only a front camera (most laptops) still works.
        controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } }, audio: false },
          video,
          (result) => {
            if (result) {
              onResultRef.current(result.getText());
            }
          },
        );
        if (cancelled) {
          controls.stop();
          return;
        }
        setStatus("scanning");
      } catch (err) {
        if (cancelled) {
          return;
        }
        const name = err instanceof Error ? err.name : "";
        setStatus("idle");
        setError(
          name === "NotAllowedError" || name === "SecurityError"
            ? "denied"
            : name === "NotFoundError" || name === "OverconstrainedError"
              ? "nocamera"
              : "unsupported",
        );
      }
    })();

    return () => {
      cancelled = true;
      controls?.stop();
      // controls.stop() ends zxing's decode loop but doesn't release the camera;
      // stop the MediaStream tracks so the camera + its indicator light turn off.
      (video.srcObject as MediaStream | null)?.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
      video.parentNode?.removeChild(video);
    };
  }, [active]);

  return { containerRef, status, error };
}
