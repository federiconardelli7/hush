import { StyleSheet, View } from "react-native";
import { BalanceCard } from "@/components/BalanceCard";
import { Button } from "@/design-system/primitives/Button";
import { ScreenContainer } from "@/design-system/primitives/ScreenContainer";
import { spacing } from "@/design-system/tokens";

// Home shell — themed balance + action tiles. Balance becomes the decrypted
// eERC balance once the wallet + eERC providers are wired (Phase 1 next steps).
export default function Home() {
  return (
    <ScreenContainer>
      <BalanceCard balance="$0.00" />
      <View style={styles.row}>
        <Button label="Add" variant="primary" style={styles.cell} />
        <Button label="Send" variant="secondary" style={styles.cell} />
      </View>
      <View style={styles.row}>
        <Button label="Request" variant="secondary" style={styles.cell} />
        <Button label="Cash out" variant="secondary" style={styles.cell} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.md, marginTop: spacing.md },
  cell: { flex: 1 },
});
