import { logger } from "./logger";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default";
  channelId?: string;
}

export async function sendExpoPush(messages: PushMessage[]): Promise<void> {
  const valid = messages.filter((m) => typeof m.to === "string" && m.to.startsWith("ExponentPushToken"));
  if (valid.length === 0) return;
  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", "Accept-Encoding": "gzip, deflate" },
      body: JSON.stringify(valid.map((m) => ({ sound: "default", channelId: "default", ...m }))),
    });
    if (!res.ok) {
      logger.warn({ status: res.status, body: await res.text().catch(() => "") }, "expo push request failed");
    }
  } catch (err) {
    logger.warn({ err }, "expo push request errored");
  }
}
