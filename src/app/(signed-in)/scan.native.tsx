import { CameraView, useCameraPermissions } from "expo-camera";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Button } from "@/design-system/primitives/Button";
import { ScreenContainer } from "@/design-system/primitives/ScreenContainer";
import { useTheme } from "@/design-system/theme";
import { radius, spacing } from "@/design-system/tokens";
import { fonts } from "@/design-system/typography";
import { useEerc } from "@/features/eerc/useEerc";
import { profilesRepo } from "@/features/profile/profilesRepo";
import { parseScannedCode } from "@/features/qr/code";
import { displayName } from "@/lib/identity";

// Native counterpart of scan.tsx (web). Identical resolve flow + paste fallback; the
// camera uses expo-camera's CameraView (QR-only) instead of the web zxing scanner.
// The camera only mounts while focused + permitted + idle, so it releases when you
// leave the tab, after a scan, or before permission is granted.
export default function ScanNative() {
  const { colors } = useTheme();
  const { address } = useEerc();
  const me = address?.toLowerCase();
  const { intent, mode } = useLocalSearchParams<{ intent?: string; mode?: string }>();
  const isAdd = intent === "add";

  const [permission, requestPermission] = useCameraPermissions();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState("");
  const handled = useRef(false);

  // Ask for camera access once when we learn it isn't granted (and we still can ask).
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  // /scan is a kept-mounted tab screen — track focus so the camera unmounts (and the
  // indicator light turns off) when you switch tabs or go back, and re-arm on return.
  const [focused, setFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      handled.current = false;
      return () => setFocused(false);
    }, []),
  );

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

  const canScan = Boolean(permission?.granted) && focused && !busy;

  return (
    <ScreenContainer>
      <ScreenHeader title={isAdd ? "Scan to add" : "Scan to pay"} />

      <View style={[styles.camera, { backgroundColor: colors.chip, borderColor: colors.line }]}>
        {canScan ? (
          <CameraView
            style={styles.cameraInner}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={({ data }) => void resolve(data)}
          />
        ) : (
          <Text style={[styles.cameraNote, { color: colors.sub }]}>
            {busy
              ? "Opening…"
              : permission && !permission.granted
                ? "Camera access is off. Allow it below, or paste the address."
                : "Point your camera at a Hush QR code."}
          </Text>
        )}
      </View>

      {permission && !permission.granted ? (
        <Button
          label="Allow camera"
          variant="ghost"
          onPress={() => void requestPermission()}
          style={styles.allow}
        />
      ) : null}

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
  allow: { marginTop: spacing.md },
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
