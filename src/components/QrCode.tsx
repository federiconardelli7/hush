import QRCode from "react-native-qrcode-svg";
import { useTheme } from "@/design-system/theme";

// SVG QR code (react-native-qrcode-svg over the already-installed react-native-svg —
// renders on web and native). Themed to the current surface so it reads in dark mode.
export function QrCode({ value, size = 220 }: { value: string; size?: number }) {
  const { colors } = useTheme();
  return (
    <QRCode
      value={value}
      size={size}
      color={colors.ink}
      backgroundColor={colors.card}
      quietZone={12}
      ecl="M"
    />
  );
}
