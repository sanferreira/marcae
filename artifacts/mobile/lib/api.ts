import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const TOKEN_KEY = "@barberpro_session_token";

const RAW_API_URL = process.env.EXPO_PUBLIC_API_URL?.trim();
const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN?.trim();

function normalizeApiBase(): string {
  if (RAW_API_URL) {
    const normalized = RAW_API_URL.replace(/\/+$/, "");
    if (Platform.OS === "android") {
      return normalized.replace("://localhost", "://10.0.2.2").replace("://127.0.0.1", "://10.0.2.2");
    }
    return normalized;
  }
  if (DOMAIN) return `https://${DOMAIN.replace(/^https?:\/\//, "").replace(/\/+$/, "")}/api`;
  return "/api";
}

export const API_BASE = normalizeApiBase();

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
      credentials: "omit",
    });
  } catch (err) {
    const message = (err as Error).message ?? "Erro de rede";
    const offlineMessage = message.toLowerCase().includes("failed to fetch")
      ? `Nao foi possivel conectar ao servidor (${API_BASE}). Confirme se a API esta rodando.`
      : message;
    return { ok: false, status: 0, error: offlineMessage };
  }
  if (res.status === 204) return { ok: true, data: undefined as T };
  let payload: unknown = null;
  try { payload = await res.json(); } catch { /* ignore */ }
  if (!res.ok) {
    const obj = (payload && typeof payload === "object") ? (payload as Record<string, unknown>) : {};
    const err = typeof obj.error === "string" ? (obj.error as string) : `Erro ${res.status}`;
    const code = typeof obj.code === "string" ? (obj.code as string) : undefined;
    if (res.status === 402) {
      for (const fn of sub402Listeners) { try { fn(); } catch { /* ignore */ } }
    }
    return { ok: false, status: res.status, error: err, code };
  }
  return { ok: true, data: payload as T };
}
