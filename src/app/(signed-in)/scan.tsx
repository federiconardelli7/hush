import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ComingSoon } from "@/components/ComingSoon";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Button } from "@/design-system/primitives/Button";
import { ScreenContainer } from "@/design-system/primitives/ScreenContainer";
import { useTheme } from "@/design-system/theme";
import { radius, spacing } from "@/design-system/tokens";
import { fonts } from "@/design-system/typography";
import { useEerc } from "@/features/eerc/useEerc";
import { profilesRepo } from "@/features/profile/profilesRepo";
import { parseScannedCode } from "@/features/qr/code";
import { useQrScanner, type QrScanError } from "@/features/qr/useQrScanner";
import { displayName } from "@/lib/identity";

const CAMERA_HINT: Record<QrScanError, string> = {
  insecure: "Camera needs a secure (https) page. Paste the address instead.",
  denied: "Camera permission denied. Paste the address instead.",
  nocamera: "No camera found. Paste the address instead.",
  unsupported: "This browser can't use the camera. Paste the address instead.",
};

// Scan a friend's Hush QR (or paste their address) to pay / request / add them.
// Camera is web-only (native = expo-camera in Phase 4); the paste field always works.
export default function Scan() {
  if (Platform.OS !== "web") {
    return <ComingSoon title="Scan a code" />;
  }
  return <WebScan />;
}

function WebScan() {
  const { colors } = useTheme();
  const { address } = useEerc();
  const me = address?.toLowerCase();
  const { intent, mode } = useLocalSearchParams<{ intent?: string; mode?: string }>();
  const isAdd = intent === "add";
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState("");
  const handled = useRef(false);

  const resolve = useCallback(
    async (raw: string) => {
      if (handled.current) {
        return;
      }
      const addr = parseScannedCode(raw);
      if (!addr) {
        setError("That's not a Hush code.");
        return;
      }
      if (addr === me) {
        setError("That's your own code.");
        return;
      }
      handled.current = true;
      setBusy(true);
      setError(null);
      try {
        const profile = await profilesRepo.getByAddress(addr);
        if (isAdd) {
          router.replace({ pathname: "/add-contact", params: { address: addr } });
        } else {
          router.replace({
            pathname: mode === "request" ? "/request-amount" : "/pay-amount",
            params: { to: addr, name: displayName(profile, addr) },
          });
        }
      } catch {
        handled.current = false;
        setBusy(false);
        setError("Couldn't look that up. Try again.");
      }
    },
    [isAdd, mode, me],
  );

  const scanner = useQrScanner(true, (text) => {
    void resolve(text);
  });

  return (
    <ScreenContainer>
      <ScreenHeader title={isAdd ? "Scan to add" : "Scan to pay"} />

      <View style={[styles.camera, { backgroundColor: colors.chip, borderColor: colors.line }]}>
        <View ref={scanner.containerRef} style={styles.cameraInner} />
        {scanner.status !== "scanning" ? (
          <Text style={[styles.cameraNote, { color: colors.sub }]}>
            {scanner.error
              ? CAMERA_HINT[scanner.error]
              : busy
                ? "Opening…"
                : "Point your camera at a Hush QR code."}
          </Text>
        ) : null}
      </View>

      <Text style={[styles.label, { color: colors.sub }]}>Or paste an address</Text>
      <TextInput
        value={manual}
        onChangeText={setManual}
        placeholder="0x…"
        placeholderTextColor={colors.sub}
        autoCapitalize="none"
        autoCorrect={false}
        style={[styles.input, { backgroundColor: colors.card, color: colors.ink, borderColor: colors.line }]}
      />
      <Button
        label={busy ? "Checking…" : isAdd ? "Add this address" : "Continue"}
        variant="primary"
        onPress={() => {
          void resolve(manual);
        }}
        style={styles.cta}
      />

      {error ? <Text style={[styles.error, { color: colors.avRed }]}>{error}</Text> : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  camera: {
    width: "100%",
    aspectRatio: 1,
    maxHeight: 320,
    borderRadius: radius.card,
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
  },
  cameraInner: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  cameraNote: {
    fontFamily: fonts.ui,
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: spacing.lg,
  },
  label: { fontFamily: fonts.ui, fontSize: 12.5, fontWeight: "600", marginTop: spacing.lg },
  input: {
    fontFamily: fonts.mono,
    fontSize: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radius.input,
    borderWidth: 1,
    marginTop: spacing.sm,
  },
  cta: { marginTop: spacing.md },
  error: { fontFamily: fonts.ui, fontSize: 13, textAlign: "center", marginTop: spacing.md },
});
