import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as WebBrowser from "expo-web-browser";
import { apiFetch, setToken } from "@/lib/api";
import { registerDeviceForPush, unregisterDeviceForPush } from "@/lib/push";

export type UserRole = "client" | "employee" | "admin";

export interface Barbershop {
  id: string;
  slug: string;
  name: string;
  ownerName: string;
  ownerEmail: string;
  phone?: string | null;
  address?: string | null;
  createdAt: string;
  trialEndsAt: string;
  plan: "trial" | "premium" | "expired";
  subscriptionRenewsAt?: string | null;
}

export interface AuthUser {
  id: string;
  barbershopId: string;
  role: UserRole;
  name: string;
  email: string;
  phone?: string | null;
  professionalId?: string | null;
  clientId?: string | null;
  createdAt: string;
}

export interface PlanStatus {
  plan: "trial" | "premium" | "expired";
  trialDaysLeft: number;
  isActive: boolean;
  isPremium: boolean;
  trialEndsAt: string;
}

interface AuthSession {
  token: string;
  user: AuthUser;
  barbershop: Barbershop;
  planStatus: PlanStatus;
}

interface AuthContextType {
  user: AuthUser | null;
  barbershop: Barbershop | null;
  isLoading: boolean;
  planStatus: PlanStatus;
  // Lookup (TODO Phase 2 — backed by API endpoint)
  barbershopUsers: AuthUser[];
  // Actions
  login: (slug: string, email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  registerBarbershop: (data: {
    slug: string; name: string; ownerName: string; ownerEmail: string;
    password: string; phone?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  registerClient: (data: {
    slug: string; name: string; email: string; phone: string; password: string;
  }) => Promise<{ ok: boolean; error?: string; barbershopId?: string; userId?: string }>;
  upsertEmployeeUser: (data: {
    professionalId: string; name: string; email: string; password: string; phone?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  removeEmployeeUser: (userId: string) => Promise<void>;
  upgradeToPremium: () => Promise<{ ok: boolean; error?: string }>;
  openBillingPortal: () => Promise<{ ok: boolean; error?: string }>;
  refreshSession: () => Promise<void>;
  cancelSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const EMPTY_PLAN: PlanStatus = { plan: "trial", trialDaysLeft: 0, isActive: false, isPremium: false, trialEndsAt: "" };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate: try /auth/me with stored token
  useEffect(() => {
    (async () => {
      const r = await apiFetch<AuthSession>("/auth/me");
      if (r.ok) {
        setSession(r.data);
        // Re-register push token on hydrate so token rotations get captured.
        void registerDeviceForPush().catch(() => undefined);
      }
      setIsLoading(false);
    })();
  }, []);

  const persistSession = useCallback(async (s: AuthSession | null) => {
    setSession(s);
    await setToken(s?.token ?? null);
    if (s) void registerDeviceForPush().catch(() => undefined);
  }, []);

  const login: AuthContextType["login"] = async (slug, email, password) => {
    const r = await apiFetch<AuthSession>("/auth/login", { method: "POST", body: { slug, email, password } });
    if (!r.ok) return { ok: false, error: r.error };
    await persistSession(r.data);
    return { ok: true };
  };

  const logout = async () => {
    await unregisterDeviceForPush().catch(() => undefined);
    await apiFetch<void>("/auth/logout", { method: "POST" });
    await persistSession(null);
  };

  const registerBarbershop: AuthContextType["registerBarbershop"] = async (data) => {
    const r = await apiFetch<AuthSession>("/auth/register-shop", { method: "POST", body: data });
    if (!r.ok) return { ok: false, error: r.error };
    await persistSession(r.data);
    return { ok: true };
  };

  const registerClient: AuthContextType["registerClient"] = async (data) => {
    const r = await apiFetch<AuthSession>("/auth/register-client", { method: "POST", body: data });
    if (!r.ok) return { ok: false, error: r.error };
    await persistSession(r.data);
    return { ok: true, barbershopId: r.data.user.barbershopId, userId: r.data.user.id };
  };

  // ── stubs (will be wired to API in Phase 2) ─────────────────────────────
  const barbershopUsers: AuthUser[] = useMemo(() => [], []);
  const upsertEmployeeUser: AuthContextType["upsertEmployeeUser"] = async () =>
    ({ ok: false, error: "Em breve: gerencie funcionários no painel completo." });
  const removeEmployeeUser: AuthContextType["removeEmployeeUser"] = async () => { /* noop */ };

  const refreshSession = useCallback(async () => {
    const r = await apiFetch<AuthSession>("/auth/me");
    if (r.ok) setSession(r.data);
  }, []);

  const upgradeToPremium: AuthContextType["upgradeToPremium"] = useCallback(async () => {
    const r = await apiFetch<{ url: string }>("/billing/checkout", { method: "POST", body: {} });
    if (!r.ok) return { ok: false, error: r.error };
    try {
      await WebBrowser.openBrowserAsync(r.data.url);
    } catch (err) {
      return { ok: false, error: (err as Error).message ?? "Não foi possível abrir o pagamento." };
    }
    // Best-effort sync — the user may close the browser without paying.
    await apiFetch("/billing/sync", { method: "POST", body: {} });
    await refreshSession();
    return { ok: true };
  }, [refreshSession]);

  const openBillingPortal: AuthContextType["openBillingPortal"] = useCallback(async () => {
    const r = await apiFetch<{ url: string }>("/billing/portal", { method: "POST", body: {} });
    if (!r.ok) return { ok: false, error: r.error };
    try { await WebBrowser.openBrowserAsync(r.data.url); }
    catch (err) { return { ok: false, error: (err as Error).message }; }
    await apiFetch("/billing/sync", { method: "POST", body: {} });
    await refreshSession();
    return { ok: true };
  }, [refreshSession]);

  const cancelSubscription = async () => { /* handled via Stripe portal */ };

  return (
    <AuthContext.Provider value={{
      user: session?.user ?? null,
      barbershop: session?.barbershop ?? null,
      planStatus: session?.planStatus ?? EMPTY_PLAN,
      isLoading,
      barbershopUsers,
      login, logout,
      registerBarbershop, registerClient,
      upsertEmployeeUser, removeEmployeeUser,
      upgradeToPremium, openBillingPortal, refreshSession, cancelSubscription,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
