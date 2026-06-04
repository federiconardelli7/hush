import { usePrivy } from "@privy-io/react-auth";
import { Redirect, Tabs } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useTheme } from "@/design-system/theme";
import { EercProvider } from "@/features/eerc/EercProvider";
import { ProfileGate } from "@/features/profile/ProfileGate";

const TAB_ICON: Record<string, string> = {
  home: "🏠",
  activity: "🧾",
  pay: "➕",
  feed: "👥",
  me: "👤",
};

// Authenticated shell: guard on Privy auth, then mount the eERC provider (which
// only initialises once the embedded wallet is ready) and the bottom tabs. The
// error boundary surfaces any eERC SDK render error instead of white-screening;
// ProfileGate blocks the tabs until the wallet has a Supabase profile.
export default function SignedInLayout() {
  const { ready, authenticated } = usePrivy();
  const { colors } = useTheme();

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
          <Tabs
            backBehavior="history"
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarActiveTintColor: colors.actBlue,
              tabBarInactiveTintColor: colors.sub,
              tabBarStyle: {
                backgroundColor: colors.card,
                borderTopColor: colors.line,
              },
              tabBarIcon: ({ color }) => (
                <Text style={{ fontSize: 18, color }}>
                  {TAB_ICON[route.name] ?? "•"}
                </Text>
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
            <Tabs.Screen name="requests" options={{ href: null }} />
            <Tabs.Screen name="edit-profile" options={{ href: null }} />
            <Tabs.Screen name="privacy" options={{ href: null }} />
            <Tabs.Screen name="notifications" options={{ href: null }} />
          </Tabs>
        </ProfileGate>
      </EercProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
