import { Platform } from "react-native";
import Constants from "expo-constants";
import { apiFetch } from "./api";

// Lazy-loaded so the web bundle doesn't crash when these native modules are absent.
type NotifModule = typeof import("expo-notifications");
type DeviceModule = typeof import("expo-device");

async function loadNotif(): Promise<NotifModule | null> {
  try { return await import("expo-notifications"); } catch { return null; }
}
async function loadDevice(): Promise<DeviceModule | null> {
  try { return await import("expo-device"); } catch { return null; }
}

let configured = false;
async function configureHandler(N: NotifModule): Promise<void> {
  if (configured) return;
  configured = true;
  N.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowAlert: true,
    }),
  });
  if (Platform.OS === "android") {
    await N.setNotificationChannelAsync("default", {
      name: "default",
      importance: N.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#C9A96E",
    });
  }
}

/** Asks for permission and returns the Expo push token, or null if unavailable. */
export async function getExpoPushToken(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  const N = await loadNotif();
  const D = await loadDevice();
  if (!N || !D) return null;
  if (!D.isDevice) return null; // simulators can't get tokens
  await configureHandler(N);
  const settings = await N.getPermissionsAsync();
  let granted = settings.granted || settings.ios?.status === N.IosAuthorizationStatus.PROVISIONAL;
  if (!granted) {
    const ask = await N.requestPermissionsAsync();
    granted = ask.granted;
  }
  if (!granted) return null;
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? undefined;
  try {
    const t = await N.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    return t.data;
  } catch {
    return null;
  }
}

/** Registers the device with the server. Best-effort; failures are silent. */
export async function registerDeviceForPush(): Promise<void> {
  const token = await getExpoPushToken();
  if (!token) return;
  await apiFetch<{ ok: boolean }>("/auth/push-token", { method: "POST", body: { token } });
}

/** Clears the server-side token (called on logout). */
export async function unregisterDeviceForPush(): Promise<void> {
  await apiFetch<{ ok: boolean }>("/auth/push-token", { method: "POST", body: { token: "" } });
}
