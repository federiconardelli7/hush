import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/features/auth/useAuth";

// Onboarding is a plain headerless stack: welcome → email → verify. If Privy
// already has an authenticated session (e.g. a reload that deep-links onto an
// onboarding route, or the OTP just succeeded), redirect into the app rather
// than trapping the user behind the form. This is the single source of truth
// for the onboarding → app transition.
export default function OnboardingLayout() {
  const { ready, authenticated } = useAuth();

  if (ready && authenticated) {
    return <Redirect href="/home" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
