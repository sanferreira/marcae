import React, { createContext, useContext, useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuth } from "./AuthContext";
import { apiFetch } from "@/lib/api";

export interface Service {
  id: string; barbershopId: string; name: string; price: number; duration: number;
  description: string; category: string; isActive: boolean;
}
export interface Product {
  id: string; barbershopId: string; name: string; price: number; costPrice: number;
  stock: number; category: string; description: string; isActive: boolean;
}

export const DAY_KEYS = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"] as const;
export type DayKey = typeof DAY_KEYS[number];
export const DAY_LABELS: Record<DayKey, string> = {
  seg: "Segunda", ter: "Terça", qua: "Quarta",
  qui: "Quinta", sex: "Sexta", sab: "Sábado", dom: "Domingo",
};
export const DAY_SHORT: Record<DayKey, string> = {
  seg: "Seg", ter: "Ter", qua: "Qua", qui: "Qui", sex: "Sex", sab: "Sáb", dom: "Dom",
};
const JS_DAY_MAP: DayKey[] = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];

export interface WorkDay { enabled: boolean; startTime: string; endTime: string; }
export type ProfessionalSchedule = Record<DayKey, WorkDay>;

export const DEFAULT_SCHEDULE: ProfessionalSchedule = {
  seg: { enabled: true, startTime: "08:00", endTime: "18:00" },
  ter: { enabled: true, startTime: "08:00", endTime: "18:00" },
  qua: { enabled: true, startTime: "08:00", endTime: "18:00" },
  qui: { enabled: true, startTime: "08:00", endTime: "18:00" },
  sex: { enabled: true, startTime: "08:00", endTime: "18:00" },
  sab: { enabled: true, startTime: "08:00", endTime: "13:00" },
  dom: { enabled: false, startTime: "08:00", endTime: "12:00" },
};

export interface Professional {
  id: string; barbershopId: string; name: string; specialty: string;
  rating: number; appointmentsCount: number; isAvailable: boolean;
  avatar: string; bio: string;
  phone?: string; email?: string; commissionRate?: number;
  schedule?: ProfessionalSchedule;
}

export interface Appointment {
  id: string; barbershopId: string;
  clientId: string; clientName: string;
  professionalId: string; professionalName: string;
  services: Service[]; date: string; time: string;
  totalPrice: number; totalDuration: number;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  paymentMethod?: string; createdAt: string; isFreeByLoyalty?: boolean;
}

export interface LoyaltySettings { requiredPoints: number; benefitDescription: string; }
export interface LoyaltyMovement {
  id: string; date: string; points: number; description: string;
  type: "earned" | "redeemed" | "adjusted";
}
export interface ClientLoyalty { currentPoints: number; history: LoyaltyMovement[]; }
export interface LoyaltyInfo {
  currentPoints: number; requiredPoints: number;
  benefitDescription: string; history: LoyaltyMovement[];
}

export interface Client {
  id: string; barbershopId: string;
  name: string; phone: string; email: string;
  birthDate?: string; totalSpent: number; appointmentsCount: number;
  lastVisit?: string; loyaltyPoints: number; notes?: string;
}

export interface CashEntry {
  id: string; barbershopId: string;
  description: string; amount: number;
  type: "income" | "expense"; category: string; paymentMethod: string; date: string;
  professionalId?: string; professionalName?: string;
}

interface DataContextType {
  services: Service[];
  products: Product[];
  professionals: Professional[];
  professionalSchedules: Record<string, ProfessionalSchedule>;
  appointments: Appointment[];
  clients: Client[];
  cashEntries: CashEntry[];
  loyaltySettings: LoyaltySettings;
  isLoading: boolean;

  addService: (s: Omit<Service, "barbershopId">) => Promise<void>;
  updateService: (s: Service) => Promise<void>;
  addProduct: (p: Omit<Product, "barbershopId">) => Promise<void>;
  updateProduct: (p: Product) => Promise<void>;
  addProfessional: (p: Omit<Professional, "barbershopId">) => Promise<void>;
  updateProfessional: (p: Professional) => Promise<void>;
  updateProfessionalSchedule: (professionalId: string, schedule: ProfessionalSchedule) => Promise<void>;

  addAppointment: (apt: Omit<Appointment, "barbershopId" | "id" | "createdAt">) => Promise<void>;
  updateAppointmentStatus: (id: string, status: Appointment["status"], paymentMethod?: string) => Promise<void>;
  cancelAppointment: (id: string) => Promise<void>;
  rescheduleAppointment: (id: string, newDate: string, newTime: string) => Promise<void>;

  addClient: (c: Omit<Client, "barbershopId" | "id">) => Promise<void>;
  addCashEntry: (e: Omit<CashEntry, "barbershopId" | "id">) => Promise<void>;
  updateLoyaltySettings: (s: LoyaltySettings) => Promise<void>;
  getClientLoyalty: (clientId: string) => LoyaltyInfo;
  adjustClientLoyalty: (clientId: string, points: number, description: string) => Promise<void>;
  getClientAppointments: (clientId: string) => Appointment[];
  getAvailableSlots: (date: string, professionalId: string, duration: number) => string[];
  getProfessionalStats: (professionalId: string) => { completed: number; revenue: number; cancelRate: number };
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const DEFAULT_SETTINGS: LoyaltySettings = { requiredPoints: 10, benefitDescription: "Corte gratuito" };

function generateTimeSlots(start: string, end: string, stepMin: number): string[] {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const slots: string[] = [];
  let h = sh, m = sm;
  while (h * 60 + m + stepMin <= eh * 60 + em) {
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    m += stepMin;
    while (m >= 60) { m -= 60; h += 1; }
  }
  return slots;
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user, barbershop } = useAuth();
  const qc = useQueryClient();
  const enabled = !!user && !!barbershop;
  const shopKey = barbershop?.id ?? "_none";

  // ── Queries ─────────────────────────────────────────────────────────────
  const services = useQuery({
    queryKey: ["services", shopKey], enabled,
    queryFn: async () => {
      const r = await apiFetch<Service[]>("/services");
      return r.ok ? r.data : [];
    },
  });
  const products = useQuery({
    queryKey: ["products", shopKey], enabled,
    queryFn: async () => {
      const r = await apiFetch<Product[]>("/products");
      return r.ok ? r.data : [];
    },
  });
  const professionals = useQuery({
    queryKey: ["professionals", shopKey], enabled,
    queryFn: async () => {
      const r = await apiFetch<Professional[]>("/professionals");
      return r.ok ? r.data : [];
    },
  });
  const clients = useQuery({
    queryKey: ["clients", shopKey], enabled,
    queryFn: async () => {
      const r = await apiFetch<Client[]>("/clients");
      return r.ok ? r.data : [];
    },
  });
  const appointments = useQuery({
    queryKey: ["appointments", shopKey], enabled,
    queryFn: async () => {
      const r = await apiFetch<Appointment[]>("/appointments");
      return r.ok ? r.data : [];
    },
  });
  const cashEntries = useQuery({
    queryKey: ["cashEntries", shopKey], enabled,
    queryFn: async () => {
      const r = await apiFetch<CashEntry[]>("/cash-entries");
      return r.ok ? r.data : [];
    },
  });
  const loyaltySettings = useQuery({
    queryKey: ["loyaltySettings", shopKey], enabled,
    queryFn: async () => {
      const r = await apiFetch<LoyaltySettings>("/loyalty/settings");
      return r.ok ? r.data : DEFAULT_SETTINGS;
    },
  });

  const invalidate = (...keys: string[]) =>
    Promise.all(keys.map((k) => qc.invalidateQueries({ queryKey: [k, shopKey] })));

  // ── Mutations (helpers) ─────────────────────────────────────────────────
  const post = async <T,>(path: string, body: unknown): Promise<T> => {
    const r = await apiFetch<T>(path, { method: "POST", body });
    if (!r.ok) throw new Error(r.error);
    return r.data;
  };
  const patch = async <T,>(path: string, body: unknown): Promise<T> => {
    const r = await apiFetch<T>(path, { method: "PATCH", body });
    if (!r.ok) throw new Error(r.error);
    return r.data;
  };

  const addService: DataContextType["addService"] = async (s) => {
    await post("/services", { name: s.name, price: s.price, duration: s.duration, description: s.description, category: s.category, isActive: s.isActive });
    await invalidate("services");
  };
  const updateService: DataContextType["updateService"] = async (s) => {
    await patch(`/services/${s.id}`, { name: s.name, price: s.price, duration: s.duration, description: s.description, category: s.category, isActive: s.isActive });
    await invalidate("services");
  };
  const addProduct: DataContextType["addProduct"] = async (p) => {
    await post("/products", { name: p.name, price: p.price, costPrice: p.costPrice, stock: p.stock, category: p.category, description: p.description, isActive: p.isActive });
    await invalidate("products");
  };
  const updateProduct: DataContextType["updateProduct"] = async (p) => {
    await patch(`/products/${p.id}`, { name: p.name, price: p.price, costPrice: p.costPrice, stock: p.stock, category: p.category, description: p.description, isActive: p.isActive });
    await invalidate("products");
  };
  const addProfessional: DataContextType["addProfessional"] = async (p) => {
    await post("/professionals", { name: p.name, specialty: p.specialty, bio: p.bio, avatar: p.avatar, phone: p.phone, email: p.email, commissionRate: p.commissionRate, isAvailable: p.isAvailable, rating: p.rating, appointmentsCount: p.appointmentsCount });
    await invalidate("professionals");
  };
  const updateProfessional: DataContextType["updateProfessional"] = async (p) => {
    await patch(`/professionals/${p.id}`, { name: p.name, specialty: p.specialty, bio: p.bio, avatar: p.avatar, phone: p.phone, email: p.email, commissionRate: p.commissionRate, isAvailable: p.isAvailable });
    await invalidate("professionals");
  };
  const updateProfessionalSchedule: DataContextType["updateProfessionalSchedule"] = async (id, schedule) => {
    await patch(`/professionals/${id}/schedule`, schedule);
    await invalidate("professionals");
  };

  const addAppointment: DataContextType["addAppointment"] = async (apt) => {
    await post("/appointments", {
      clientId: apt.clientId, clientName: apt.clientName,
      professionalId: apt.professionalId, professionalName: apt.professionalName,
      services: apt.services.map((s) => ({ id: s.id, name: s.name, price: s.price, duration: s.duration })),
      date: apt.date, time: apt.time,
      totalPrice: apt.totalPrice, totalDuration: apt.totalDuration,
      status: apt.status, paymentMethod: apt.paymentMethod,
      isFreeByLoyalty: apt.isFreeByLoyalty ?? false,
    });
    await invalidate("appointments", "clients");
  };
  const updateAppointmentStatus: DataContextType["updateAppointmentStatus"] = async (id, status, paymentMethod) => {
    await patch(`/appointments/${id}`, { status, paymentMethod });
    await invalidate("appointments", "clients");
  };
  const cancelAppointment: DataContextType["cancelAppointment"] = async (id) => {
    await patch(`/appointments/${id}`, { status: "cancelled" });
    await invalidate("appointments");
  };
  const rescheduleAppointment: DataContextType["rescheduleAppointment"] = async (id, newDate, newTime) => {
    await patch(`/appointments/${id}`, { date: newDate, time: newTime });
    await invalidate("appointments");
  };

  const addClient: DataContextType["addClient"] = async (c) => {
    // Client users created via /auth/register-client already get a clients row server-side.
    // This only runs for walk-in clients added by admin (not yet wired in UI), so keep best-effort.
    await post("/clients", { name: c.name, phone: c.phone, email: c.email, birthDate: c.birthDate, notes: c.notes });
    await invalidate("clients");
  };
  const addCashEntry: DataContextType["addCashEntry"] = async (e) => {
    await post("/cash-entries", e);
    await invalidate("cashEntries");
  };
  const updateLoyaltySettings: DataContextType["updateLoyaltySettings"] = async (s) => {
    await patch("/loyalty/settings", s);
    await invalidate("loyaltySettings");
  };
  const adjustClientLoyalty: DataContextType["adjustClientLoyalty"] = async (clientId, points, description) => {
    await post(`/clients/${clientId}/loyalty/adjust`, { points, description });
    await invalidate("clients");
  };

  // ── Derived ─────────────────────────────────────────────────────────────
  const professionalSchedules = useMemo<Record<string, ProfessionalSchedule>>(() => {
    const m: Record<string, ProfessionalSchedule> = {};
    for (const p of professionals.data ?? []) {
      m[p.id] = p.schedule ?? DEFAULT_SCHEDULE;
    }
    return m;
  }, [professionals.data]);

  const getClientLoyalty: DataContextType["getClientLoyalty"] = (clientId) => {
    const c = (clients.data ?? []).find((cl) => cl.id === clientId);
    const settings = loyaltySettings.data ?? DEFAULT_SETTINGS;
    return {
      currentPoints: c?.loyaltyPoints ?? 0,
      requiredPoints: settings.requiredPoints,
      benefitDescription: settings.benefitDescription,
      history: [], // detailed history fetched on demand by client detail screens
    };
  };
  const getClientAppointments: DataContextType["getClientAppointments"] = (clientId) =>
    (appointments.data ?? []).filter((a) => a.clientId === clientId);

  const getAvailableSlots: DataContextType["getAvailableSlots"] = (date, professionalId, _duration) => {
    const schedule = professionalSchedules[professionalId] ?? DEFAULT_SCHEDULE;
    const dayOfWeek = new Date(date + "T12:00:00").getDay();
    const dayKey = JS_DAY_MAP[dayOfWeek];
    const workDay = schedule[dayKey];
    if (!workDay.enabled) return [];
    const allSlots = generateTimeSlots(workDay.startTime, workDay.endTime, 30);
    const booked = (appointments.data ?? [])
      .filter((a) => a.date === date && a.professionalId === professionalId && a.status !== "cancelled")
      .map((a) => a.time);
    return allSlots.filter((s) => !booked.includes(s));
  };

  const getProfessionalStats: DataContextType["getProfessionalStats"] = (professionalId) => {
    const apts = (appointments.data ?? []).filter((a) => a.professionalId === professionalId);
    const completed = apts.filter((a) => a.status === "completed");
    const cancelled = apts.filter((a) => a.status === "cancelled");
    const revenue = completed.reduce((s, a) => s + a.totalPrice, 0);
    const cancelRate = apts.length > 0 ? Math.round((cancelled.length / apts.length) * 100) : 0;
    return { completed: completed.length, revenue, cancelRate };
  };

  // Suppress unused warning from useMutation import (kept for future optimistic updates)
  void useMutation;

  const isLoading = enabled && (services.isLoading || professionals.isLoading || appointments.isLoading);

  return (
    <DataContext.Provider value={{
      services: services.data ?? [],
      products: products.data ?? [],
      professionals: professionals.data ?? [],
      professionalSchedules,
      appointments: appointments.data ?? [],
      clients: clients.data ?? [],
      cashEntries: cashEntries.data ?? [],
      loyaltySettings: loyaltySettings.data ?? DEFAULT_SETTINGS,
      isLoading,
      addService, updateService, addProduct, updateProduct,
      addProfessional, updateProfessional, updateProfessionalSchedule,
      addAppointment, updateAppointmentStatus, cancelAppointment, rescheduleAppointment,
      addClient, addCashEntry, updateLoyaltySettings,
      getClientLoyalty, adjustClientLoyalty,
      getClientAppointments, getAvailableSlots, getProfessionalStats,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
