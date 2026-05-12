import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "@barberpro_session_token";

const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN;
export const API_BASE = DOMAIN ? `https://${DOMAIN}/api` : "/api";

export async function getToken(): Promise<string | null> {
  try { return await AsyncStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export async function setToken(token: string | null): Promise<void> {
  try {
    if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
    else await AsyncStorage.removeItem(TOKEN_KEY);
  } catch { /* ignore */ }
}

export interface ApiResult<T> { ok: true; data: T } 
export interface ApiError { ok: false; status: number; error: string; code?: string }

/** Listener notified whenever the API returns 402 (subscription required). */
type Sub402Listener = () => void;
const sub402Listeners = new Set<Sub402Listener>();
export function onSubscriptionRequired(fn: Sub402Listener): () => void {
  sub402Listeners.add(fn);
  return () => sub402Listeners.delete(fn);
}

export async function apiFetch<T>(
  path: string,
  opts: { method?: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown; auth?: boolean } = {},
): Promise<ApiResult<T> | ApiError> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.auth !== false) {
    const t = await getToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      credentials: "include",
    });
  } catch (err) {
    return { ok: false, status: 0, error: (err as Error).message ?? "Erro de rede" };
  }
  if (res.status === 204) return { ok: true, data: undefined as T };
  let payload: unknown = null;
  try { payload = await res.json(); } catch { /* ignore */ }
  if (!res.ok) {
    const obj = (payload && typeof payload === "object") ? (payload as Record<string, unknown>) : {};
    const err = typeof obj.error === "string" ? (obj.error as string) : `Erro ${res.status}`;
    const code = typeof obj.code === "string" ? (obj.code as string) : undefined;
    if (res.status === 402) {
      // Notify any subscription gates so the UI can route to /upgrade.
      for (const fn of sub402Listeners) { try { fn(); } catch { /* ignore */ } }
    }
    return { ok: false, status: res.status, error: err, code };
  }
  return { ok: true, data: payload as T };
}
