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
export interface ApiError { ok: false; status: number; error: string }

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
    const err = (payload && typeof payload === "object" && "error" in payload && typeof (payload as { error: unknown }).error === "string")
      ? (payload as { error: string }).error
      : `Erro ${res.status}`;
    return { ok: false, status: res.status, error: err };
  }
  return { ok: true, data: payload as T };
}
