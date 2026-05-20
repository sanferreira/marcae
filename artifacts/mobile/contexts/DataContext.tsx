import React, { createContext, useContext, useEffect, useMemo, useRef } from "react";
import { Alert } from "react-native";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuth } from "./AuthContext";
import { apiFetch } from "@/lib/api";

export interface Service {
  id: string; barbershopId: string; name: string; price: number; duration: number;
  loyaltyPoints: number;
  description: string; category: string; isActive: boolean;
}
export interface Product {
  id: string; barbershopId: string; name: string; price: number; costPrice: number;
  stock: number; category: string; description: string; isActive: boolean;
}

export interface Category {
  id: string; barbershopId: string;
  type: "service" | "product" | "income" | "expense"; name: string; createdAt: string;
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
  avatar: string; avatarImage?: string; bio: string;
  phone?: string; email?: string; commissionRate?: number;
  serviceIds?: string[];
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
  clientNotes?: string; professionalNotes?: string;
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
  productOrdersSpent?: number;
  lastVisit?: string; loyaltyPoints: number; notes?: string;
  allergies?: string; restrictions?: string; preferences?: string; emergencyContact?: string;
  intakeData?: Record<string, string>;
}

export interface CashEntry {
  id: string; barbershopId: string;
  description: string; amount: number;
  type: "income" | "expense"; category: string; paymentMethod: string; date: string;
  professionalId?: string; professionalName?: string;
}

export interface ProductOrderItem {
  id: string; orderId: string; productId: string;
  productName: string; unitPrice: number; quantity: number;
}

export interface ProductOrder {
  id: string; barbershopId: string; clientId: string; clientName: string;
  appointmentId?: string;
  status: "pending" | "paid" | "delivered" | "cancelled";
  totalPrice: number; paymentMethod?: string;
  notes: string; createdAt: string;
  items: ProductOrderItem[];
}

export interface ServicePackage {
  id: string; barbershopId: string; serviceId?: string;
  name: string; description: string; sessionsTotal: number;
  price: number; validityDays: number; isActive: boolean; createdAt: string;
}

export interface ClientPackage {
  id: string; barbershopId: string; clientId: string; packageId?: string; serviceId?: string;
  packageName: string; serviceName: string; sessionsTotal: number; sessionsUsed: number;
  sessionsRemaining: number; pricePaid: number; expiresAt?: string;
  status: "active" | "used" | "expired" | "cancelled"; createdAt: string;
}

export interface ReportOverview {
  from: string; to: string; revenue: number; expenses: number; profit: number;
  appointments: number; completed: number; cancelled: number;
  topServices: Array<{ name: string; count: number; revenue: number }>;
  byProfessional: Array<{ id: string; name: string; completed: number; revenue: number; commissionRate: number; commission: number; occupancyPct: number }>;
}

interface DataContextType {
  services: Service[];
  products: Product[];
  categories: Category[];
  productOrders: ProductOrder[];
  servicePackages: ServicePackage[];
  clientPackages: ClientPackage[];
  professionals: Professional[];
  professionalSchedules: Record<string, ProfessionalSchedule>;
  appointments: Appointment[];
  clients: Client[];
  cashEntries: CashEntry[];
  loyaltySettings: LoyaltySettings;
  isLoading: boolean;

  addService: (s: Omit<Service, "barbershopId">) => Promise<void>;
  updateService: (s: Service) => Promise<void>;
  deleteService: (id: string) => Promise<void>;
  addProduct: (p: Omit<Product, "barbershopId">) => Promise<void>;
  updateProduct: (p: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addCategory: (c: Pick<Category, "type" | "name">) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  createProductOrder: (items: Array<{ productId: string; quantity: number }>, notes?: string, appointmentId?: string) => Promise<ProductOrder>;
  updateProductOrderStatus: (id: string, status: ProductOrder["status"], paymentMethod?: string) => Promise<void>;
  addServicePackage: (p: Omit<ServicePackage, "id" | "barbershopId" | "createdAt">) => Promise<void>;
  updateServicePackage: (p: ServicePackage) => Promise<void>;
  assignClientPackage: (clientId: string, packageId: string, pricePaid?: number) => Promise<void>;
  cancelClientPackage: (id: string) => Promise<void>;
  addProfessional: (p: Omit<Professional, "barbershopId">) => Promise<Professional>;
  updateProfessional: (p: Professional) => Promise<void>;
  deleteProfessional: (id: string) => Promise<void>;
  updateProfessionalSchedule: (professionalId: string, schedule: ProfessionalSchedule) => Promise<void>;

  addAppointment: (apt: Omit<Appointment, "barbershopId" | "id" | "createdAt">) => Promise<Appointment>;
  updateAppointmentStatus: (id: string, status: Appointment["status"], paymentMethod?: string) => Promise<void>;
  confirmAppointment: (id: string) => Promise<void>;
  cancelAppointment: (id: string) => Promise<void>;
  rescheduleAppointment: (id: string, newDate: string, newTime: string) => Promise<void>;
  updateAppointmentNotes: (id: string, professionalNotes: string) => Promise<void>;

  addClient: (c: Omit<Client, "barbershopId" | "id">) => Promise<void>;
  updateClient: (c: Client) => Promise<void>;
  exportClientsCsv: () => Promise<{ filename: string; csv: string }>;
  importClientsCsv: (csv: string) => Promise<{ created: number; skipped: number }>;
  addCashEntry: (e: Omit<CashEntry, "barbershopId" | "id">) => Promise<void>;
  updateLoyaltySettings: (s: LoyaltySettings) => Promise<void>;
  getClientLoyalty: (clientId: string) => LoyaltyInfo;
  adjustClientLoyalty: (clientId: string, points: number, description: string) => Promise<void>;
  getClientAppointments: (clientId: string) => Appointment[];
  getAvailableSlots: (date: string, professionalId: string, duration: number) => string[];
  getProfessionalStats: (professionalId: string) => { completed: number; revenue: number; cancelRate: number; commission: number; occupancyPct: number };
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const DEFAULT_SETTINGS: LoyaltySettings = { requiredPoints: 10, benefitDescription: "Atendimento gratuito" };
const LIVE_APPOINTMENTS_REFETCH_MS = 10000;

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

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return (hours * 60) + minutes;
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function hasOverlap(startA: string, durationA: number, startB: string, durationB: number): boolean {
  const startMinutesA = timeToMinutes(startA);
  const endMinutesA = startMinutesA + durationA;
  const startMinutesB = timeToMinutes(startB);
  const endMinutesB = startMinutesB + durationB;
  return startMinutesA < endMinutesB && startMinutesB < endMinutesA;
}

function hasBufferedConflict(startA: string, durationA: number, startB: string, durationB: number, bufferMinutes: number): boolean {
  const startMinutesA = timeToMinutes(startA);
  const startMinutesB = timeToMinutes(startB);

  if (startMinutesA <= startMinutesB) {
    return (startMinutesA + durationA + bufferMinutes) > startMinutesB;
  }

  return (startMinutesB + durationB + bufferMinutes) > startMinutesA;
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
  const categories = useQuery({
    queryKey: ["categories", shopKey], enabled,
    queryFn: async () => {
      const r = await apiFetch<Category[]>("/categories");
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
    refetchInterval: enabled ? LIVE_APPOINTMENTS_REFETCH_MS : false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
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
  const productOrders = useQuery({
    queryKey: ["productOrders", shopKey], enabled,
    queryFn: async () => {
      const r = await apiFetch<ProductOrder[]>("/product-orders");
      return r.ok ? r.data : [];
    },
  });
  const servicePackages = useQuery({
    queryKey: ["servicePackages", shopKey], enabled,
    queryFn: async () => {
      const r = await apiFetch<ServicePackage[]>("/service-packages");
      return r.ok ? r.data : [];
    },
  });
  const clientPackages = useQuery({
    queryKey: ["clientPackages", shopKey], enabled,
    queryFn: async () => {
      const r = await apiFetch<ClientPackage[]>("/client-packages");
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
  const currentClientLoyalty = useQuery({
    queryKey: ["clientLoyalty", shopKey, user?.clientId ?? "_none"],
    enabled: enabled && !!user?.clientId,
    queryFn: async () => {
      const r = await apiFetch<LoyaltyInfo>(`/clients/${user!.clientId}/loyalty`);
      return r.ok ? r.data : null;
    },
  });

  const invalidate = (...keys: string[]) =>
    Promise.all(keys.map((k) => qc.invalidateQueries({ queryKey: [k, shopKey] })));

  const knownAppointmentIds = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!enabled || user?.role === "client") {
      knownAppointmentIds.current = null;
      return;
    }
    if (!appointments.isFetched) return;

    const rows = appointments.data ?? [];
    if (knownAppointmentIds.current === null) {
      knownAppointmentIds.current = new Set(rows.map((appointment) => appointment.id));
      return;
    }

    const relevantNewAppointments = rows
      .filter((appointment) => !knownAppointmentIds.current!.has(appointment.id))
      .filter((appointment) => appointment.status !== "cancelled")
      .filter((appointment) => user?.role === "admin" || appointment.professionalId === user?.professionalId)
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));

    rows.forEach((appointment) => knownAppointmentIds.current!.add(appointment.id));

    const latest = relevantNewAppointments[0];
    if (!latest) return;

    const serviceNames = latest.services.map((service) => service.name).join(" + ");
    const dateLabel = new Date(`${latest.date}T12:00:00`).toLocaleDateString("pt-BR");
    Alert.alert(
      "Novo agendamento",
      `${latest.clientName} marcou ${serviceNames} com ${latest.professionalName} para ${dateLabel} as ${latest.time}.`,
    );
  }, [appointments.data, appointments.isFetched, enabled, user?.professionalId, user?.role]);

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
  const remove = async (path: string): Promise<void> => {
    const r = await apiFetch<void>(path, { method: "DELETE" });
    if (!r.ok) throw new Error(r.error);
  };

  const addService: DataContextType["addService"] = async (s) => {
    await post("/services", { name: s.name, price: s.price, duration: s.duration, loyaltyPoints: s.loyaltyPoints ?? 1, description: s.description, category: s.category, isActive: s.isActive });
    await invalidate("services", "categories");
  };
  const updateService: DataContextType["updateService"] = async (s) => {
    await patch(`/services/${s.id}`, { name: s.name, price: s.price, duration: s.duration, loyaltyPoints: s.loyaltyPoints ?? 1, description: s.description, category: s.category, isActive: s.isActive });
    await invalidate("services", "categories");
  };
  const deleteService: DataContextType["deleteService"] = async (id) => {
    await remove(`/services/${id}`);
    await invalidate("services", "appointments", "categories");
  };
  const addProduct: DataContextType["addProduct"] = async (p) => {
    await post("/products", { name: p.name, price: p.price, costPrice: p.costPrice, stock: p.stock, category: p.category, description: p.description, isActive: p.isActive });
    await invalidate("products", "categories");
  };
  const updateProduct: DataContextType["updateProduct"] = async (p) => {
    await patch(`/products/${p.id}`, { name: p.name, price: p.price, costPrice: p.costPrice, stock: p.stock, category: p.category, description: p.description, isActive: p.isActive });
    await invalidate("products", "categories");
  };
  const deleteProduct: DataContextType["deleteProduct"] = async (id) => {
    await remove(`/products/${id}`);
    await invalidate("products", "categories");
  };
  const addCategory: DataContextType["addCategory"] = async (c) => {
    await post("/categories", { name: c.name, type: c.type });
    await invalidate("categories");
  };
  const deleteCategory: DataContextType["deleteCategory"] = async (id) => {
    await remove(`/categories/${id}`);
    await invalidate("categories");
  };
  const createProductOrder: DataContextType["createProductOrder"] = async (items, notes, appointmentId) => {
    const order = await post<ProductOrder>("/product-orders", { items, notes: notes ?? "", appointmentId });
    await invalidate("productOrders", "products");
    return order;
  };
  const updateProductOrderStatus: DataContextType["updateProductOrderStatus"] = async (id, status, paymentMethod) => {
    await patch(`/product-orders/${id}`, { status, paymentMethod });
    await invalidate("productOrders", "products", "clients", "cashEntries", "categories");
  };
  const addServicePackage: DataContextType["addServicePackage"] = async (p) => {
    await post("/service-packages", p);
    await invalidate("servicePackages", "categories");
  };
  const updateServicePackage: DataContextType["updateServicePackage"] = async (p) => {
    await patch(`/service-packages/${p.id}`, p);
    await invalidate("servicePackages", "categories");
  };
  const assignClientPackage: DataContextType["assignClientPackage"] = async (clientId, packageId, pricePaid) => {
    await post("/client-packages", { clientId, packageId, pricePaid });
    await invalidate("clientPackages", "clients", "cashEntries", "categories");
  };
  const cancelClientPackage: DataContextType["cancelClientPackage"] = async (id) => {
    await patch(`/client-packages/${id}/cancel`, {});
    await invalidate("clientPackages");
  };
  const addProfessional: DataContextType["addProfessional"] = async (p) => {
    const created = await post<Professional>("/professionals", { name: p.name, specialty: p.specialty, bio: p.bio, avatar: p.avatar, avatarImage: p.avatarImage, phone: p.phone, email: p.email, commissionRate: p.commissionRate, isAvailable: p.isAvailable, rating: p.rating, appointmentsCount: p.appointmentsCount, serviceIds: p.serviceIds ?? [] });
    await invalidate("professionals");
    return created;
  };
  const updateProfessional: DataContextType["updateProfessional"] = async (p) => {
    await patch(`/professionals/${p.id}`, { name: p.name, specialty: p.specialty, bio: p.bio, avatar: p.avatar, avatarImage: p.avatarImage, phone: p.phone, email: p.email, commissionRate: p.commissionRate, isAvailable: p.isAvailable, serviceIds: p.serviceIds ?? [] });
    await invalidate("professionals");
  };
  const deleteProfessional: DataContextType["deleteProfessional"] = async (id) => {
    await remove(`/professionals/${id}`);
    await invalidate("professionals");
  };
  const updateProfessionalSchedule: DataContextType["updateProfessionalSchedule"] = async (id, schedule) => {
    await patch(`/professionals/${id}/schedule`, schedule);
    await invalidate("professionals");
  };

  const addAppointment: DataContextType["addAppointment"] = async (apt) => {
    const created = await post<Appointment>("/appointments", {
      clientId: apt.clientId, clientName: apt.clientName,
      professionalId: apt.professionalId, professionalName: apt.professionalName,
      services: apt.services.map((s) => ({ id: s.id, name: s.name, price: s.price, duration: s.duration })),
      date: apt.date, time: apt.time,
      totalPrice: apt.totalPrice, totalDuration: apt.totalDuration,
      status: apt.status, paymentMethod: apt.paymentMethod,
      isFreeByLoyalty: apt.isFreeByLoyalty ?? false,
      clientNotes: apt.clientNotes ?? "",
    });
    await invalidate("appointments", "clients", "clientPackages");
    return created;
  };
  const updateAppointmentStatus: DataContextType["updateAppointmentStatus"] = async (id, status, paymentMethod) => {
    await patch(`/appointments/${id}`, { status, paymentMethod });
    await invalidate("appointments", "clients", "cashEntries", "categories");
  };
  const confirmAppointment: DataContextType["confirmAppointment"] = async (id) => {
    await patch(`/appointments/${id}`, { status: "confirmed" });
    await invalidate("appointments");
  };
  const cancelAppointment: DataContextType["cancelAppointment"] = async (id) => {
    await patch(`/appointments/${id}`, { status: "cancelled" });
    await invalidate("appointments");
  };
  const rescheduleAppointment: DataContextType["rescheduleAppointment"] = async (id, newDate, newTime) => {
    await patch(`/appointments/${id}`, { date: newDate, time: newTime });
    await invalidate("appointments");
  };
  const updateAppointmentNotes: DataContextType["updateAppointmentNotes"] = async (id, professionalNotes) => {
    await patch(`/appointments/${id}`, { professionalNotes });
    await invalidate("appointments");
  };

  const addClient: DataContextType["addClient"] = async (c) => {
    // Client users created via /auth/register-client already get a clients row server-side.
    // This only runs for walk-in clients added by admin (not yet wired in UI), so keep best-effort.
    await post("/clients", {
      name: c.name, phone: c.phone, email: c.email, birthDate: c.birthDate, notes: c.notes,
      allergies: c.allergies ?? "", restrictions: c.restrictions ?? "", preferences: c.preferences ?? "",
      emergencyContact: c.emergencyContact ?? "",
      intakeData: c.intakeData ?? {},
    });
    await invalidate("clients");
  };
  const updateClient: DataContextType["updateClient"] = async (c) => {
    await patch(`/clients/${c.id}`, {
      name: c.name, phone: c.phone, email: c.email, birthDate: c.birthDate, notes: c.notes,
      allergies: c.allergies ?? "", restrictions: c.restrictions ?? "", preferences: c.preferences ?? "",
      emergencyContact: c.emergencyContact ?? "",
      intakeData: c.intakeData ?? {},
    });
    await invalidate("clients");
  };
  const exportClientsCsv: DataContextType["exportClientsCsv"] = async () => {
    const r = await apiFetch<{ filename: string; csv: string }>("/clients/export");
    if (!r.ok) throw new Error(r.error);
    return r.data;
  };
  const importClientsCsv: DataContextType["importClientsCsv"] = async (csv) => {
    const r = await apiFetch<{ created: number; skipped: number }>("/clients/import", { method: "POST", body: { csv } });
    if (!r.ok) throw new Error(r.error);
    await invalidate("clients");
    return r.data;
  };
  const addCashEntry: DataContextType["addCashEntry"] = async (e) => {
    await post("/cash-entries", e);
    await invalidate("cashEntries", "categories");
  };
  const updateLoyaltySettings: DataContextType["updateLoyaltySettings"] = async (s) => {
    await patch("/loyalty/settings", s);
    await invalidate("loyaltySettings");
  };
  const adjustClientLoyalty: DataContextType["adjustClientLoyalty"] = async (clientId, points, description) => {
    await post(`/clients/${clientId}/loyalty/adjust`, { points, description });
    await invalidate("clients", "clientLoyalty");
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
    if (currentClientLoyalty.data && clientId === user?.clientId) return currentClientLoyalty.data;
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

  const getAvailableSlots: DataContextType["getAvailableSlots"] = (date, professionalId, duration) => {
    const schedule = professionalSchedules[professionalId] ?? DEFAULT_SCHEDULE;
    const businessSchedule = barbershop?.businessSchedule ?? DEFAULT_SCHEDULE;
    const dayOfWeek = new Date(date + "T12:00:00").getDay();
    const dayKey = JS_DAY_MAP[dayOfWeek];
    const workDay = schedule[dayKey];
    const shopDay = businessSchedule[dayKey] ?? DEFAULT_SCHEDULE[dayKey];
    if (!workDay.enabled || !shopDay.enabled) return [];
    const startMinutes = Math.max(timeToMinutes(workDay.startTime), timeToMinutes(shopDay.startTime));
    const endMinutes = Math.min(timeToMinutes(workDay.endTime), timeToMinutes(shopDay.endTime));
    if (startMinutes >= endMinutes) return [];
    const effectiveWorkDay = { startTime: minutesToTime(startMinutes), endTime: minutesToTime(endMinutes) };
    const allSlots = generateTimeSlots(effectiveWorkDay.startTime, effectiveWorkDay.endTime, 30);
    const clientId = user?.role === "client" ? user.clientId : null;
    const bufferMinutes = barbershop?.bookingBufferMinutes ?? 0;
    const availabilityMode = barbershop?.bookingAvailabilityMode ?? "duration_buffer";
    const relevantAppointments = (appointments.data ?? [])
      .filter((a) => a.date === date)
      .filter((a) =>
        availabilityMode === "release_on_complete"
          ? a.status === "confirmed" || a.status === "pending"
          : a.status !== "cancelled")
      .filter((a) => a.professionalId === professionalId || (!!clientId && a.clientId === clientId));
    const workEndMinutes = timeToMinutes(effectiveWorkDay.endTime);

    return allSlots.filter((slot) => {
      if (timeToMinutes(slot) + duration + bufferMinutes > workEndMinutes) return false;

      const professionalConflict = relevantAppointments.some((apt) =>
        apt.professionalId === professionalId &&
        hasBufferedConflict(apt.time, apt.totalDuration, slot, duration, bufferMinutes));
      if (professionalConflict) return false;

      const clientConflict = !!clientId && relevantAppointments.some((apt) =>
        apt.clientId === clientId &&
        hasBufferedConflict(apt.time, apt.totalDuration, slot, duration, bufferMinutes));
      return !clientConflict;
    });
  };

  const getProfessionalStats: DataContextType["getProfessionalStats"] = (professionalId) => {
    const apts = (appointments.data ?? []).filter((a) => a.professionalId === professionalId);
    const completed = apts.filter((a) => a.status === "completed");
    const cancelled = apts.filter((a) => a.status === "cancelled");
    const revenue = completed.reduce((s, a) => s + a.totalPrice, 0);
    const cancelRate = apts.length > 0 ? Math.round((cancelled.length / apts.length) * 100) : 0;
    const professional = (professionals.data ?? []).find((p) => p.id === professionalId);
    const commissionRate = professional?.commissionRate ?? 50;
    const commission = Math.round(revenue * (commissionRate / 100));
    const bookedMinutes = apts.filter((a) => a.status !== "cancelled").reduce((s, a) => s + a.totalDuration, 0);
    const completedMinutes = completed.reduce((s, a) => s + a.totalDuration, 0);
    const occupancyPct = bookedMinutes > 0 ? Math.round((completedMinutes / bookedMinutes) * 100) : 0;
    return { completed: completed.length, revenue, cancelRate, commission, occupancyPct };
  };

  // Suppress unused warning from useMutation import (kept for future optimistic updates)
  void useMutation;

  const isLoading = enabled && (services.isLoading || professionals.isLoading || appointments.isLoading);

  return (
    <DataContext.Provider value={{
      services: services.data ?? [],
      products: products.data ?? [],
      categories: categories.data ?? [],
      productOrders: productOrders.data ?? [],
      servicePackages: servicePackages.data ?? [],
      clientPackages: clientPackages.data ?? [],
      professionals: professionals.data ?? [],
      professionalSchedules,
      appointments: appointments.data ?? [],
      clients: clients.data ?? [],
      cashEntries: cashEntries.data ?? [],
      loyaltySettings: loyaltySettings.data ?? DEFAULT_SETTINGS,
      isLoading,
      addService, updateService, addProduct, updateProduct,
      deleteService, deleteProduct,
      addCategory, deleteCategory,
      createProductOrder, updateProductOrderStatus,
      addServicePackage, updateServicePackage, assignClientPackage, cancelClientPackage,
      addProfessional, updateProfessional, deleteProfessional, updateProfessionalSchedule,
      addAppointment, updateAppointmentStatus, confirmAppointment, cancelAppointment, rescheduleAppointment, updateAppointmentNotes,
      addClient, updateClient, exportClientsCsv, importClientsCsv, addCashEntry, updateLoyaltySettings,
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
