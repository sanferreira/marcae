import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import { apiFetch, setToken } from "@/lib/api";
import { registerDeviceForPush, unregisterDeviceForPush } from "@/lib/push";
import { DEFAULT_PAID_PLAN, type PaidPlanKey, type SubscriptionPlanKey } from "@/constants/plans";

export type UserRole = "client" | "employee" | "admin";
export type ScheduleDayKey = "seg" | "ter" | "qua" | "qui" | "sex" | "sab" | "dom";
export interface ScheduleDay { enabled: boolean; startTime: string; endTime: string; }
export type BusinessSchedule = Record<ScheduleDayKey, ScheduleDay>;
export interface IntakeField { key: string; label: string; type: "text" | "textarea" | "date" | "phone"; }

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
  plan: SubscriptionPlanKey;
  subscriptionRenewsAt?: string | null;
  brandPrimary: string;
  brandAccent: string;
  bookingBufferMinutes: number;
  bookingAvailabilityMode: "duration_buffer" | "release_on_complete";
  businessSchedule: BusinessSchedule;
  intakeFields: IntakeField[];
}

export interface AuthUser {
  id: string;
  barbershopId: string;
  role: UserRole;
  name: string;
  email: string;
  phone?: string | null;
  avatarImage?: string | null;
  professionalId?: string | null;
  clientId?: string | null;
  createdAt: string;
}

export interface PlanStatus {
  plan: SubscriptionPlanKey;
  trialDaysLeft: number;
  isActive: boolean;
  isPremium: boolean;
  isPaid?: boolean;
  planName?: string;
  planPrice?: string | null;
  trialEndsAt: string;
  features?: {
    team: boolean;
    commissions: boolean;
    notifications: boolean;
    reports: boolean;
    advancedReports?: boolean;
    limits?: {
      professionals: number;
      employeeLogins: number;
    };
  };
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
  // Employee users linked to professionals in this barbershop.
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
  upgradeToPremium: (plan?: PaidPlanKey) => Promise<{ ok: boolean; error?: string }>;
  openBillingPortal: () => Promise<{ ok: boolean; error?: string }>;
  refreshSession: () => Promise<void>;
  cancelSubscription: () => Promise<void>;
  updateBarbershop: (patch: { name?: string; phone?: string | null; address?: string | null; brandPrimary?: string; brandAccent?: string; bookingBufferMinutes?: number; bookingAvailabilityMode?: "duration_buffer" | "release_on_complete"; businessSchedule?: BusinessSchedule; intakeFields?: IntakeField[] }) => Promise<{ ok: boolean; error?: string }>;
  updateProfile: (patch: { name?: string; email?: string; phone?: string | null; avatar?: string; avatarImage?: string | null; specialty?: string; bio?: string }) => Promise<{ ok: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const EMPTY_PLAN: PlanStatus = { plan: "trial", trialDaysLeft: 0, isActive: false, isPremium: false, trialEndsAt: "" };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [barbershopUsers, setBarbershopUsers] = useState<AuthUser[]>([]);

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
    await setToken(s?.token ?? null);
    setSession(s);
    if (!s) setBarbershopUsers([]);
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

  const refreshEmployeeUsers = useCallback(async () => {
    const r = await apiFetch<AuthUser[]>("/employees");
    setBarbershopUsers(r.ok ? r.data : []);
  }, []);

  useEffect(() => {
    if (session?.user.role === "admin") {
      void refreshEmployeeUsers();
      return;
    }
    setBarbershopUsers([]);
  }, [refreshEmployeeUsers, session?.token, session?.user.role]);

  const upsertEmployeeUser: AuthContextType["upsertEmployeeUser"] = useCallback(async (data) => {
    const r = await apiFetch<AuthUser>("/employees", { method: "POST", body: data });
    if (!r.ok) return { ok: false, error: r.error };

    setBarbershopUsers((current) => {
      const next = current.filter((user) => user.id !== r.data.id && user.professionalId !== r.data.professionalId);
      return [...next, r.data];
    });
    return { ok: true };
  }, []);

  const removeEmployeeUser: AuthContextType["removeEmployeeUser"] = useCallback(async (userId) => {
    const r = await apiFetch<void>(`/employees/${userId}`, { method: "DELETE" });
    if (r.ok) setBarbershopUsers((current) => current.filter((user) => user.id !== userId));
  }, []);

  const refreshSession = useCallback(async () => {
    const r = await apiFetch<AuthSession>("/auth/me");
    if (r.ok) setSession(r.data);
  }, []);

  const upgradeToPremium: AuthContextType["upgradeToPremium"] = useCallback(async (plan = DEFAULT_PAID_PLAN) => {
    const r = await apiFetch<{ url: string }>("/billing/checkout", { method: "POST", body: { plan } });
    if (!r.ok) return { ok: false, error: r.error };
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.location.assign(r.data.url);
      return { ok: true };
    }
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
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.location.assign(r.data.url);
      return { ok: true };
    }
    try { await WebBrowser.openBrowserAsync(r.data.url); }
    catch (err) { return { ok: false, error: (err as Error).message }; }
    await apiFetch("/billing/sync", { method: "POST", body: {} });
    await refreshSession();
    return { ok: true };
  }, [refreshSession]);

  const cancelSubscription = async () => { /* handled via Stripe portal */ };

  const updateBarbershop: AuthContextType["updateBarbershop"] = useCallback(async (patch) => {
    const r = await apiFetch<Barbershop>("/establishment", { method: "PATCH", body: patch });
    if (!r.ok) return { ok: false, error: r.error };
    setSession((s) => (s ? { ...s, barbershop: { ...s.barbershop, ...r.data } } : s));
    return { ok: true };
  }, []);

  const updateProfile: AuthContextType["updateProfile"] = useCallback(async (patch) => {
    const r = await apiFetch<AuthSession>("/auth/me", { method: "PATCH", body: patch });
    if (!r.ok) return { ok: false, error: r.error };
    setSession(r.data);
    return { ok: true };
  }, []);

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
      updateBarbershop, updateProfile,
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
