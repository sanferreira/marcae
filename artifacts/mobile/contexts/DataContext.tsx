import React, { createContext, useContext, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";

export interface Service {
  id: string;
  barbershopId: string;
  name: string;
  price: number;
  duration: number;
  description: string;
  category: string;
  isActive: boolean;
}

export interface Product {
  id: string;
  barbershopId: string;
  name: string;
  price: number;
  costPrice: number;
  stock: number;
  category: string;
  description: string;
  isActive: boolean;
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
  id: string;
  barbershopId: string;
  name: string;
  specialty: string;
  rating: number;
  appointmentsCount: number;
  isAvailable: boolean;
  avatar: string;
  bio: string;
  phone?: string;
  email?: string;
  commissionRate?: number;
}

export interface Appointment {
  id: string;
  barbershopId: string;
  clientId: string;
  clientName: string;
  professionalId: string;
  professionalName: string;
  services: Service[];
  date: string;
  time: string;
  totalPrice: number;
  totalDuration: number;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  paymentMethod?: string;
  createdAt: string;
  isFreeByLoyalty?: boolean;
}

export interface LoyaltySettings {
  requiredPoints: number;
  benefitDescription: string;
}

export interface LoyaltyMovement {
  id: string;
  date: string;
  points: number;
  description: string;
  type: "earned" | "redeemed" | "adjusted";
}

export interface ClientLoyalty { currentPoints: number; history: LoyaltyMovement[]; }

export interface LoyaltyInfo {
  currentPoints: number;
  requiredPoints: number;
  benefitDescription: string;
  history: LoyaltyMovement[];
}

export interface Client {
  id: string;
  barbershopId: string;
  name: string;
  phone: string;
  email: string;
  birthDate?: string;
  totalSpent: number;
  appointmentsCount: number;
  lastVisit?: string;
  loyaltyPoints: number;
  notes?: string;
}

export interface CashEntry {
  id: string;
  barbershopId: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  paymentMethod: string;
  date: string;
  professionalId?: string;
  professionalName?: string;
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

  addService: (s: Omit<Service, "barbershopId">) => Promise<void>;
  updateService: (s: Service) => Promise<void>;
  addProduct: (p: Omit<Product, "barbershopId">) => Promise<void>;
  updateProduct: (p: Product) => Promise<void>;
  addProfessional: (p: Omit<Professional, "barbershopId">) => Promise<void>;
  updateProfessional: (p: Professional) => Promise<void>;
  updateProfessionalSchedule: (professionalId: string, schedule: ProfessionalSchedule) => Promise<void>;

  addAppointment: (apt: Omit<Appointment, "barbershopId">) => Promise<void>;
  updateAppointmentStatus: (id: string, status: Appointment["status"], paymentMethod?: string) => Promise<void>;
  cancelAppointment: (id: string) => Promise<void>;
  rescheduleAppointment: (id: string, newDate: string, newTime: string) => Promise<void>;

  addCashEntry: (e: Omit<CashEntry, "barbershopId">) => Promise<void>;
  updateLoyaltySettings: (s: LoyaltySettings) => Promise<void>;
  getClientLoyalty: (clientId: string) => LoyaltyInfo;
  adjustClientLoyalty: (clientId: string, points: number, description: string) => Promise<void>;
  getClientAppointments: (clientId: string) => Appointment[];
  getAvailableSlots: (date: string, professionalId: string, duration: number) => string[];
  getProfessionalStats: (professionalId: string) => { completed: number; revenue: number; cancelRate: number };
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// ── seed (all for bb-001 / primeiro_nucleo) ──────────────────────────────────
const SHOP = "bb-001";

const INITIAL_SERVICES: Service[] = [
  { id: "s1", barbershopId: SHOP, name: "Corte de Cabelo", price: 45, duration: 30, description: "Corte clássico ou moderno conforme sua preferência", category: "Cabelo", isActive: true },
  { id: "s2", barbershopId: SHOP, name: "Barba", price: 35, duration: 25, description: "Aparagem e modelagem de barba com toalha quente", category: "Barba", isActive: true },
  { id: "s3", barbershopId: SHOP, name: "Corte + Barba", price: 70, duration: 50, description: "Combo completo: corte e barba com tratamento", category: "Combo", isActive: true },
  { id: "s4", barbershopId: SHOP, name: "Sobrancelha", price: 20, duration: 15, description: "Modelagem de sobrancelha com pinça ou navalha", category: "Estética", isActive: true },
  { id: "s5", barbershopId: SHOP, name: "Hidratação Capilar", price: 55, duration: 40, description: "Tratamento profundo de hidratação para os cabelos", category: "Tratamento", isActive: true },
  { id: "s6", barbershopId: SHOP, name: "Bigode", price: 15, duration: 15, description: "Aparagem e modelagem de bigode", category: "Barba", isActive: true },
];

const INITIAL_PRODUCTS: Product[] = [
  { id: "pr1", barbershopId: SHOP, name: "Pomada Matte", price: 45, costPrice: 20, stock: 12, category: "Pomada", description: "Pomada com fixação forte e acabamento matte", isActive: true },
  { id: "pr2", barbershopId: SHOP, name: "Pomada Brilho", price: 40, costPrice: 18, stock: 8, category: "Pomada", description: "Pomada com fixação média e brilho intenso", isActive: true },
  { id: "pr3", barbershopId: SHOP, name: "Óleo para Barba", price: 55, costPrice: 22, stock: 15, category: "Barba", description: "Óleo hidratante e perfumado para barba", isActive: true },
  { id: "pr4", barbershopId: SHOP, name: "Balm para Barba", price: 48, costPrice: 20, stock: 6, category: "Barba", description: "Balm nutritivo para barba ressecada", isActive: true },
  { id: "pr5", barbershopId: SHOP, name: "Shampoo Anticaspa", price: 35, costPrice: 15, stock: 20, category: "Cabelo", description: "Shampoo profissional anticaspa", isActive: true },
  { id: "pr6", barbershopId: SHOP, name: "Cera Modeladora", price: 38, costPrice: 16, stock: 10, category: "Pomada", description: "Cera para modelagem com fixação leve", isActive: true },
];

const INITIAL_PROFESSIONALS: Professional[] = [
  { id: "p1", barbershopId: SHOP, name: "Rafael Mendes", specialty: "Cortes Clássicos", rating: 4.9, appointmentsCount: 312, isAvailable: true, avatar: "RM", bio: "10 anos de experiência em cortes clássicos e modernos", phone: "(11) 99111-1111", email: "rafael@barberpro.com", commissionRate: 50 },
  { id: "p2", barbershopId: SHOP, name: "Diego Santos", specialty: "Barbas & Design", rating: 4.8, appointmentsCount: 278, isAvailable: true, avatar: "DS", bio: "Especialista em design de barba e barbearia tradicional", phone: "(11) 99222-2222", email: "diego@barberpro.com", commissionRate: 50 },
  { id: "p3", barbershopId: SHOP, name: "Lucas Oliveira", specialty: "Cortes Modernos", rating: 4.7, appointmentsCount: 195, isAvailable: true, avatar: "LO", bio: "Focado nas tendências de cortes atuais e coloração", phone: "(11) 99333-3333", email: "lucas@barberpro.com", commissionRate: 45 },
];

const TODAY = new Date();
const fmt = (d: Date) => d.toISOString().split("T")[0];

const INITIAL_APPOINTMENTS: Appointment[] = [
  { id: "a1", barbershopId: SHOP, clientId: "client-001", clientName: "João Silva", professionalId: "p1", professionalName: "Rafael Mendes", services: [INITIAL_SERVICES[0]], date: fmt(new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + 1)), time: "09:00", totalPrice: 45, totalDuration: 30, status: "confirmed", createdAt: new Date().toISOString() },
  { id: "a2", barbershopId: SHOP, clientId: "client-001", clientName: "João Silva", professionalId: "p2", professionalName: "Diego Santos", services: [INITIAL_SERVICES[2]], date: fmt(new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() - 7)), time: "14:00", totalPrice: 70, totalDuration: 50, status: "completed", paymentMethod: "PIX", createdAt: new Date(TODAY.getTime() - 7 * 86400000).toISOString() },
  { id: "a3", barbershopId: SHOP, clientId: "client-002", clientName: "Marcos Pereira", professionalId: "p1", professionalName: "Rafael Mendes", services: [INITIAL_SERVICES[0], INITIAL_SERVICES[1]], date: fmt(TODAY), time: "11:00", totalPrice: 80, totalDuration: 55, status: "confirmed", createdAt: new Date().toISOString() },
  { id: "a4", barbershopId: SHOP, clientId: "client-003", clientName: "Bruno Lima", professionalId: "p3", professionalName: "Lucas Oliveira", services: [INITIAL_SERVICES[0]], date: fmt(TODAY), time: "15:30", totalPrice: 45, totalDuration: 30, status: "pending", createdAt: new Date().toISOString() },
  { id: "a5", barbershopId: SHOP, clientId: "client-004", clientName: "André Costa", professionalId: "p2", professionalName: "Diego Santos", services: [INITIAL_SERVICES[2]], date: fmt(new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() - 14)), time: "10:00", totalPrice: 70, totalDuration: 50, status: "completed", paymentMethod: "Cartão", createdAt: new Date(TODAY.getTime() - 14 * 86400000).toISOString() },
  { id: "a6", barbershopId: SHOP, clientId: "client-005", clientName: "Pedro Souza", professionalId: "p1", professionalName: "Rafael Mendes", services: [INITIAL_SERVICES[0]], date: fmt(new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() - 30)), time: "16:00", totalPrice: 45, totalDuration: 30, status: "completed", paymentMethod: "Dinheiro", createdAt: new Date(TODAY.getTime() - 30 * 86400000).toISOString() },
  { id: "a7", barbershopId: SHOP, clientId: "client-001", clientName: "João Silva", professionalId: "p1", professionalName: "Rafael Mendes", services: [INITIAL_SERVICES[2]], date: fmt(TODAY), time: "16:30", totalPrice: 70, totalDuration: 50, status: "confirmed", createdAt: new Date().toISOString() },
];

const INITIAL_CLIENTS: Client[] = [
  { id: "client-001", barbershopId: SHOP, name: "João Silva", phone: "(11) 98765-4321", email: "joao@email.com", totalSpent: 420, appointmentsCount: 8, lastVisit: fmt(new Date(TODAY.getTime() - 7 * 86400000)), loyaltyPoints: 4, notes: "Prefere corte máquina 2 na lateral" },
  { id: "client-002", barbershopId: SHOP, name: "Marcos Pereira", phone: "(11) 97654-3210", email: "marcos@email.com", totalSpent: 680, appointmentsCount: 12, lastVisit: fmt(TODAY), loyaltyPoints: 7 },
  { id: "client-003", barbershopId: SHOP, name: "Bruno Lima", phone: "(11) 96543-2109", email: "bruno@email.com", totalSpent: 315, appointmentsCount: 6, lastVisit: fmt(new Date(TODAY.getTime() - 14 * 86400000)), loyaltyPoints: 3 },
  { id: "client-004", barbershopId: SHOP, name: "André Costa", phone: "(11) 95432-1098", email: "andre@email.com", totalSpent: 920, appointmentsCount: 18, lastVisit: fmt(new Date(TODAY.getTime() - 3 * 86400000)), loyaltyPoints: 9, notes: "Cliente VIP" },
  { id: "client-005", barbershopId: SHOP, name: "Pedro Souza", phone: "(11) 94321-0987", email: "pedro@email.com", totalSpent: 180, appointmentsCount: 4, lastVisit: fmt(new Date(TODAY.getTime() - 30 * 86400000)), loyaltyPoints: 2 },
];

const INITIAL_CASH: CashEntry[] = [
  { id: "c1", barbershopId: SHOP, description: "Corte + Barba - Marcos", amount: 80, type: "income", category: "Serviço", paymentMethod: "PIX", date: fmt(TODAY), professionalName: "Rafael Mendes" },
  { id: "c2", barbershopId: SHOP, description: "Corte - André", amount: 45, type: "income", category: "Serviço", paymentMethod: "Dinheiro", date: fmt(TODAY), professionalName: "Diego Santos" },
  { id: "c3", barbershopId: SHOP, description: "Produtos de cabelo", amount: 180, type: "expense", category: "Produto", paymentMethod: "Cartão de Débito", date: fmt(TODAY) },
];

const INITIAL_LOYALTY_MAP: Record<string, ClientLoyalty> = {
  "client-001": { currentPoints: 4, history: [
    { id: "l1", date: fmt(new Date(TODAY.getTime() - 7 * 86400000)), points: 1, description: "Corte + Barba realizado", type: "earned" },
    { id: "l2", date: fmt(new Date(TODAY.getTime() - 21 * 86400000)), points: 1, description: "Corte de Cabelo realizado", type: "earned" },
    { id: "l3", date: fmt(new Date(TODAY.getTime() - 35 * 86400000)), points: 1, description: "Corte + Barba realizado", type: "earned" },
    { id: "l4", date: fmt(new Date(TODAY.getTime() - 49 * 86400000)), points: 1, description: "Corte de Cabelo realizado", type: "earned" },
  ]},
  "client-002": { currentPoints: 7, history: [
    { id: "lm1", date: fmt(new Date(TODAY.getTime() - 5 * 86400000)), points: 1, description: "Corte + Barba realizado", type: "earned" },
    { id: "lm2", date: fmt(new Date(TODAY.getTime() - 30 * 86400000)), points: 6, description: "Pontos acumulados", type: "adjusted" },
  ]},
  "client-003": { currentPoints: 3, history: [{ id: "lb1", date: fmt(new Date(TODAY.getTime() - 14 * 86400000)), points: 3, description: "Cortes realizados", type: "earned" }]},
  "client-004": { currentPoints: 9, history: [
    { id: "la1", date: fmt(new Date(TODAY.getTime() - 3 * 86400000)), points: 1, description: "Corte realizado", type: "earned" },
    { id: "la2", date: fmt(new Date(TODAY.getTime() - 12 * 86400000)), points: 8, description: "Pontos acumulados", type: "adjusted" },
  ]},
  "client-005": { currentPoints: 2, history: [{ id: "lp1", date: fmt(new Date(TODAY.getTime() - 30 * 86400000)), points: 2, description: "Cortes realizados", type: "earned" }]},
};

const DEFAULT_LOYALTY: LoyaltySettings = { requiredPoints: 10, benefitDescription: "Corte de cabelo gratuito" };
const INITIAL_LOYALTY_SETTINGS: Record<string, LoyaltySettings> = {
  [SHOP]: DEFAULT_LOYALTY,
};

const INITIAL_SCHEDULES: Record<string, ProfessionalSchedule> = {
  p1: { ...DEFAULT_SCHEDULE },
  p2: { ...DEFAULT_SCHEDULE, dom: { enabled: false, startTime: "08:00", endTime: "12:00" } },
  p3: { ...DEFAULT_SCHEDULE, seg: { enabled: false, startTime: "08:00", endTime: "18:00" }, sab: { enabled: false, startTime: "08:00", endTime: "13:00" } },
};

function generateTimeSlots(startTime: string, endTime: string, intervalMins = 30): string[] {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const slots: string[] = [];
  let total = sh * 60 + sm;
  const end = eh * 60 + em;
  while (total < end) {
    slots.push(`${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`);
    total += intervalMins;
  }
  return slots;
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const shopId = user?.barbershopId ?? "__none__";

  const [allServices, setAllServices] = useState<Service[]>(INITIAL_SERVICES);
  const [allProducts, setAllProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [allProfessionals, setAllProfessionals] = useState<Professional[]>(INITIAL_PROFESSIONALS);
  const [professionalSchedules, setProfessionalSchedules] = useState<Record<string, ProfessionalSchedule>>(INITIAL_SCHEDULES);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>(INITIAL_APPOINTMENTS);
  const [allClients, setAllClients] = useState<Client[]>(INITIAL_CLIENTS);
  const [allCashEntries, setAllCashEntries] = useState<CashEntry[]>(INITIAL_CASH);
  const [loyaltyMap, setLoyaltyMap] = useState<Record<string, ClientLoyalty>>(INITIAL_LOYALTY_MAP);
  const [loyaltySettingsMap, setLoyaltySettingsMap] = useState<Record<string, LoyaltySettings>>(INITIAL_LOYALTY_SETTINGS);

  // Scoped views
  const services = useMemo(() => allServices.filter((s) => s.barbershopId === shopId), [allServices, shopId]);
  const products = useMemo(() => allProducts.filter((p) => p.barbershopId === shopId), [allProducts, shopId]);
  const professionals = useMemo(() => allProfessionals.filter((p) => p.barbershopId === shopId), [allProfessionals, shopId]);
  const appointments = useMemo(() => allAppointments.filter((a) => a.barbershopId === shopId), [allAppointments, shopId]);
  const clients = useMemo(() => allClients.filter((c) => c.barbershopId === shopId), [allClients, shopId]);
  const cashEntries = useMemo(() => allCashEntries.filter((c) => c.barbershopId === shopId), [allCashEntries, shopId]);
  const loyaltySettings = loyaltySettingsMap[shopId] ?? DEFAULT_LOYALTY;

  // Tenant-safe match: only update rows belonging to current shop
  const sameTenant = (rowShopId: string) => rowShopId === shopId;

  // ── services ────────────────────────────────────────────────────────────────
  const addService: DataContextType["addService"] = async (s) =>
    setAllServices((p) => [...p, { ...s, barbershopId: shopId }]);
  const updateService = async (s: Service) =>
    setAllServices((p) => p.map((sv) => (sv.id === s.id && sameTenant(sv.barbershopId)) ? { ...s, barbershopId: sv.barbershopId } : sv));

  // ── products ────────────────────────────────────────────────────────────────
  const addProduct: DataContextType["addProduct"] = async (p) =>
    setAllProducts((prev) => [...prev, { ...p, barbershopId: shopId }]);
  const updateProduct = async (p: Product) =>
    setAllProducts((prev) => prev.map((pr) => (pr.id === p.id && sameTenant(pr.barbershopId)) ? { ...p, barbershopId: pr.barbershopId } : pr));

  // ── professionals ───────────────────────────────────────────────────────────
  const addProfessional: DataContextType["addProfessional"] = async (p) => {
    const full: Professional = { ...p, barbershopId: shopId };
    setAllProfessionals((prev) => [...prev, full]);
    setProfessionalSchedules((prev) => ({ ...prev, [full.id]: { ...DEFAULT_SCHEDULE } }));
  };
  const updateProfessional = async (p: Professional) =>
    setAllProfessionals((prev) => prev.map((pr) => (pr.id === p.id && sameTenant(pr.barbershopId)) ? { ...p, barbershopId: pr.barbershopId } : pr));
  const updateProfessionalSchedule = async (professionalId: string, schedule: ProfessionalSchedule) => {
    // Only allow updating schedules of professionals owned by this tenant
    const owns = allProfessionals.some((pr) => pr.id === professionalId && sameTenant(pr.barbershopId));
    if (!owns) return;
    setProfessionalSchedules((prev) => ({ ...prev, [professionalId]: schedule }));
  };

  // ── appointments ────────────────────────────────────────────────────────────
  const addAppointment: DataContextType["addAppointment"] = async (apt) =>
    setAllAppointments((p) => [{ ...apt, barbershopId: shopId }, ...p]);

  const updateAppointmentStatus = async (id: string, status: Appointment["status"], paymentMethod?: string) => {
    let done: Appointment | undefined;
    setAllAppointments((prev) =>
      prev.map((a) => {
        if (a.id === id && sameTenant(a.barbershopId)) {
          done = { ...a, status, ...(paymentMethod ? { paymentMethod } : {}) };
          return done;
        }
        return a;
      })
    );
    if (status === "completed" && done) {
      const { clientId } = done;
      const settings = loyaltySettingsMap[done.barbershopId] ?? DEFAULT_LOYALTY;
      setLoyaltyMap((prev) => {
        const ex = prev[clientId] ?? { currentPoints: 0, history: [] };
        const pts = Math.min(ex.currentPoints + 1, settings.requiredPoints);
        return { ...prev, [clientId]: { currentPoints: pts, history: [{ id: Date.now().toString(), date: fmt(new Date()), points: 1, description: "Atendimento concluído", type: "earned" }, ...ex.history] } };
      });
      setAllClients((prev) =>
        prev.map((c) => (c.id === clientId && sameTenant(c.barbershopId)) ? { ...c, loyaltyPoints: Math.min(c.loyaltyPoints + 1, settings.requiredPoints), lastVisit: fmt(new Date()) } : c)
      );
    }
  };

  const cancelAppointment = async (id: string) =>
    setAllAppointments((p) => p.map((a) => (a.id === id && sameTenant(a.barbershopId)) ? { ...a, status: "cancelled" } : a));

  const rescheduleAppointment = async (id: string, newDate: string, newTime: string) =>
    setAllAppointments((p) =>
      p.map((a) => (a.id === id && sameTenant(a.barbershopId)) ? { ...a, date: newDate, time: newTime, status: "confirmed" } : a)
    );

  // ── cash ────────────────────────────────────────────────────────────────────
  const addCashEntry: DataContextType["addCashEntry"] = async (e) =>
    setAllCashEntries((p) => [{ ...e, barbershopId: shopId }, ...p]);

  // ── loyalty ─────────────────────────────────────────────────────────────────
  const updateLoyaltySettings = async (s: LoyaltySettings) =>
    setLoyaltySettingsMap((prev) => ({ ...prev, [shopId]: s }));

  const getClientLoyalty = (clientId: string): LoyaltyInfo => {
    const entry = loyaltyMap[clientId] ?? { currentPoints: 0, history: [] };
    return { currentPoints: entry.currentPoints, requiredPoints: loyaltySettings.requiredPoints, benefitDescription: loyaltySettings.benefitDescription, history: entry.history };
  };

  const adjustClientLoyalty = async (clientId: string, points: number, description: string) => {
    setLoyaltyMap((prev) => {
      const ex = prev[clientId] ?? { currentPoints: 0, history: [] };
      const pts = Math.max(0, Math.min(ex.currentPoints + points, loyaltySettings.requiredPoints));
      return { ...prev, [clientId]: { currentPoints: pts, history: [{ id: Date.now().toString(), date: fmt(new Date()), points: Math.abs(points), description, type: points >= 0 ? "adjusted" : "redeemed" }, ...ex.history] } };
    });
    setAllClients((prev) =>
      prev.map((c) => c.id === clientId ? { ...c, loyaltyPoints: Math.max(0, Math.min(c.loyaltyPoints + points, loyaltySettings.requiredPoints)) } : c)
    );
  };

  // ── helpers ─────────────────────────────────────────────────────────────────
  const getClientAppointments = (clientId: string) => appointments.filter((a) => a.clientId === clientId);

  const getAvailableSlots = (date: string, professionalId: string, duration: number): string[] => {
    const schedule = professionalSchedules[professionalId] ?? DEFAULT_SCHEDULE;
    const dayOfWeek = new Date(date + "T12:00:00").getDay();
    const dayKey = JS_DAY_MAP[dayOfWeek];
    const workDay = schedule[dayKey];
    if (!workDay.enabled) return [];
    const allSlots = generateTimeSlots(workDay.startTime, workDay.endTime, 30);
    const booked = appointments
      .filter((a) => a.date === date && a.professionalId === professionalId && a.status !== "cancelled")
      .map((a) => a.time);
    return allSlots.filter((s) => !booked.includes(s));
  };

  const getProfessionalStats = (professionalId: string) => {
    const apts = appointments.filter((a) => a.professionalId === professionalId);
    const completed = apts.filter((a) => a.status === "completed");
    const cancelled = apts.filter((a) => a.status === "cancelled");
    const revenue = completed.reduce((s, a) => s + a.totalPrice, 0);
    const cancelRate = apts.length > 0 ? Math.round((cancelled.length / apts.length) * 100) : 0;
    return { completed: completed.length, revenue, cancelRate };
  };

  return (
    <DataContext.Provider value={{
      services, products, professionals, professionalSchedules, appointments, clients, cashEntries, loyaltySettings,
      addService, updateService, addProduct, updateProduct,
      addProfessional, updateProfessional, updateProfessionalSchedule,
      addAppointment, updateAppointmentStatus, cancelAppointment, rescheduleAppointment,
      addCashEntry, updateLoyaltySettings, getClientLoyalty, adjustClientLoyalty,
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
