import { Component, type ReactNode } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";

type Props = { children: ReactNode };
type State = { error: Error | null };

// Catches render errors (e.g. from the eERC SDK init) and shows them on screen
// instead of white-screening — invaluable while validating the SDK on-device.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }
    return (
      <ScrollView contentContainerStyle={styles.wrap}>
        <Text style={styles.title}>Something errored</Text>
        <Text style={styles.msg}>{error.message}</Text>
        {error.stack ? <Text style={styles.stack}>{error.stack}</Text> : null}
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  wrap: { padding: 24, gap: 12, flexGrow: 1, backgroundColor: "#FFF" },
  title: { fontSize: 18, fontWeight: "700", color: "#E84142" },
  msg: { fontSize: 14, color: "#0B0B0E" },
  stack: { fontSize: 11, fontFamily: "monospace", color: "#8C887F" },
});
