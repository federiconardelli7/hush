// Web: no OS push — the in-app bell covers notifications. The .native pair
// registers the device's Expo push token and routes notification taps.
export function usePushRegistration(_address: string | undefined): void {}

export async function unregisterPushToken(): Promise<void> {}
