import { usePrivy } from "@privy-io/react-auth";
import { Redirect, Tabs } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Sidebar } from "@/components/Sidebar";
import { useTheme } from "@/design-system/theme";
import { layout } from "@/design-system/tokens";
import { EercProvider } from "@/features/eerc/EercProvider";
import { ProfileGate } from "@/features/profile/ProfileGate";

const TAB_ICON: Record<string, string> = {
  home: "🏠",
  activity: "🧾",
  pay: "➕",
  feed: "👥",
  me: "👤",
};

// Authenticated shell: guard on Privy auth, then mount the eERC provider (which only
// initialises once the embedded wallet is ready) and the navigation. On wide viewports a
// left Sidebar sits beside the content and the bottom tab bar is hidden; on narrow ones
// the bottom tab bar shows as before. The Tabs navigator (and all routes) is unchanged.
export default function SignedInLayout() {
  const { ready, authenticated } = usePrivy();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= layout.wide;

  if (!ready) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.actBlue} />
      </View>
    );
  }
  if (!authenticated) {
    return <Redirect href="/onboarding/welcome" />;
  }

  return (
    <ErrorBoundary>
      <EercProvider>
        <ProfileGate>
          <View style={[styles.shell, { flexDirection: isWide ? "row" : "column", backgroundColor: colors.bg }]}>
            {isWide ? <Sidebar /> : null}
            <View style={styles.scene}>
              <Tabs
                backBehavior="history"
                screenOptions={({ route }) => ({
                  headerShown: false,
                  tabBarActiveTintColor: colors.actBlue,
                  tabBarInactiveTintColor: colors.sub,
                  tabBarStyle: isWide
                    ? { display: "none" }
                    : { backgroundColor: colors.card, borderTopColor: colors.line },
                  tabBarIcon: ({ color }) => (
                    <Text style={{ fontSize: 18, color }}>{TAB_ICON[route.name] ?? "•"}</Text>
                  ),
                })}
              >
                <Tabs.Screen name="home" options={{ title: "Home" }} />
                <Tabs.Screen name="activity" options={{ title: "Activity" }} />
                <Tabs.Screen name="pay" options={{ title: "Pay" }} />
                <Tabs.Screen name="feed" options={{ title: "Feed" }} />
                <Tabs.Screen name="me" options={{ title: "Me" }} />
                <Tabs.Screen name="add-money" options={{ href: null }} />
                <Tabs.Screen name="pay-amount" options={{ href: null }} />
                <Tabs.Screen name="cash-out" options={{ href: null }} />
                <Tabs.Screen name="contacts" options={{ href: null }} />
                <Tabs.Screen name="add-contact" options={{ href: null }} />
                <Tabs.Screen name="contact" options={{ href: null }} />
                <Tabs.Screen name="receipt" options={{ href: null }} />
                <Tabs.Screen name="request-amount" options={{ href: null }} />
                <Tabs.Screen name="edit-profile" options={{ href: null }} />
                <Tabs.Screen name="privacy" options={{ href: null }} />
                <Tabs.Screen name="notifications" options={{ href: null }} />
                <Tabs.Screen name="my-code" options={{ href: null }} />
                <Tabs.Screen name="scan" options={{ href: null }} />
              </Tabs>
            </View>
          </View>
        </ProfileGate>
      </EercProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  shell: { flex: 1 },
  scene: { flex: 1, minWidth: 0 },
});
