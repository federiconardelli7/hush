import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";
import { pushTokensRepo } from "@/features/push/pushTokensRepo";

// EAS project — getExpoPushTokenAsync needs it to mint the ExponentPushToken.
const PROJECT_ID = "1e98e056-bd7a-4a75-b85c-c28a37cd96f3";

// Foreground presentation: suppress banners — the in-app bell already covers
// everything while the app is open. This handler only runs in the foreground;
// background/killed notifications are rendered by the OS regardless.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

let currentToken: string | null = null;

// Registers this device for pushes once a wallet is signed in: permission
// prompt (Android 13+ shows the system dialog once), Expo push token, upsert
// into push_tokens. Failures are logged and non-fatal — registration succeeds
// once FCM credentials exist (Firebase setup); until then pushes simply don't
// arrive on this device while everything else works.
export function usePushRegistration(address: string | undefined): void {
  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    (async () => {
      try {
        if (Platform.OS === "android") {
          // HIGH = heads-up banner. Channels are immutable once created, so this
          // id must change if the importance ever does (hence not "default").
          await Notifications.setNotificationChannelAsync("payments", {
            name: "Payments & activity",
            importance: Notifications.AndroidImportance.HIGH,
          });
        }
        const perm = await Notifications.requestPermissionsAsync();
        if (!perm.granted || cancelled) return;
        const { data: token } = await Notifications.getExpoPushTokenAsync({
          projectId: PROJECT_ID,
        });
        if (cancelled) return;
        currentToken = token;
        await pushTokensRepo.upsert(token, address, Platform.OS === "ios" ? "ios" : "android");
      } catch (error) {
        console.error("push registration failed:", error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [address]);

  // Tapping a banner opens the notifications inbox (v1: same target for all kinds).
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      router.push("/notifications");
    });
    return () => sub.remove();
  }, []);
}

// Called on sign-out BEFORE the session is torn down (the delete runs through
// the authed client; RLS only lets the owner remove their rows).
export async function unregisterPushToken(): Promise<void> {
  if (!currentToken) return;
  try {
    await pushTokensRepo.remove(currentToken);
  } catch (error) {
    console.error("push token cleanup failed:", error);
  }
  currentToken = null;
}
