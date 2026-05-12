import React, { createContext, useContext, useState } from "react";

export interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  description: string;
  category: string;
  isActive: boolean;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  costPrice: number;
  stock: number;
  category: string;
  description: string;
  isActive: boolean;
}

export interface Professional {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  appointmentsCount: number;
  isAvailable: boolean;
  avatar: string;
  bio: string;
}

export interface Appointment {
  id: string;
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

export interface ClientLoyalty {
  currentPoints: number;
  history: LoyaltyMovement[];
}

export interface LoyaltyInfo {
  currentPoints: number;
  requiredPoints: number;
  benefitDescription: string;
  history: LoyaltyMovement[];
}

export interface Client {
  id: string;
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
  appointments: Appointment[];
  clients: Client[];
  cashEntries: CashEntry[];
  loyaltySettings: LoyaltySettings;
  addAppointment: (apt: Appointment) => Promise<void>;
  updateAppointmentStatus: (
    id: string,
    status: Appointment["status"],
    paymentMethod?: string
  ) => Promise<void>;
  cancelAppointment: (id: string) => Promise<void>;
  addService: (s: Service) => Promise<void>;
  updateService: (s: Service) => Promise<void>;
  addProduct: (p: Product) => Promise<void>;
  updateProduct: (p: Product) => Promise<void>;
  addCashEntry: (e: CashEntry) => Promise<void>;
  updateLoyaltySettings: (s: LoyaltySettings) => Promise<void>;
  getClientLoyalty: (clientId: string) => LoyaltyInfo;
  adjustClientLoyalty: (clientId: string, points: number, description: string) => Promise<void>;
  getClientAppointments: (clientId: string) => Appointment[];
  getAvailableSlots: (date: string, professionalId: string, duration: number) => string[];
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const INITIAL_SERVICES: Service[] = [
  { id: "s1", name: "Corte de Cabelo", price: 45, duration: 30, description: "Corte clássico ou moderno conforme sua preferência", category: "Cabelo", isActive: true },
  { id: "s2", name: "Barba", price: 35, duration: 25, description: "Aparagem e modelagem de barba com toalha quente", category: "Barba", isActive: true },
  { id: "s3", name: "Corte + Barba", price: 70, duration: 50, description: "Combo completo: corte e barba com tratamento", category: "Combo", isActive: true },
  { id: "s4", name: "Sobrancelha", price: 20, duration: 15, description: "Modelagem de sobrancelha com pinça ou navalha", category: "Estética", isActive: true },
  { id: "s5", name: "Hidratação Capilar", price: 55, duration: 40, description: "Tratamento profundo de hidratação para os cabelos", category: "Tratamento", isActive: true },
  { id: "s6", name: "Bigode", price: 15, duration: 15, description: "Aparagem e modelagem de bigode", category: "Barba", isActive: true },
];

const INITIAL_PRODUCTS: Product[] = [
  { id: "pr1", name: "Pomada Matte", price: 45, costPrice: 20, stock: 12, category: "Pomada", description: "Pomada com fixação forte e acabamento matte", isActive: true },
  { id: "pr2", name: "Pomada Brilho", price: 40, costPrice: 18, stock: 8, category: "Pomada", description: "Pomada com fixação média e brilho intenso", isActive: true },
  { id: "pr3", name: "Óleo para Barba", price: 55, costPrice: 22, stock: 15, category: "Barba", description: "Óleo hidratante e perfumado para barba", isActive: true },
  { id: "pr4", name: "Balm para Barba", price: 48, costPrice: 20, stock: 6, category: "Barba", description: "Balm nutritivo para barba ressecada", isActive: true },
  { id: "pr5", name: "Shampoo Anticaspa", price: 35, costPrice: 15, stock: 20, category: "Cabelo", description: "Shampoo profissional anticaspa", isActive: true },
  { id: "pr6", name: "Cera Modeladora", price: 38, costPrice: 16, stock: 10, category: "Pomada", description: "Cera para modelagem com fixação leve", isActive: true },
];

const INITIAL_PROFESSIONALS: Professional[] = [
  { id: "p1", name: "Rafael Mendes", specialty: "Cortes Clássicos", rating: 4.9, appointmentsCount: 312, isAvailable: true, avatar: "RM", bio: "10 anos de experiência em cortes clássicos e modernos" },
  { id: "p2", name: "Diego Santos", specialty: "Barbas & Design", rating: 4.8, appointmentsCount: 278, isAvailable: true, avatar: "DS", bio: "Especialista em design de barba e barbearia tradicional" },
  { id: "p3", name: "Lucas Oliveira", specialty: "Cortes Modernos", rating: 4.7, appointmentsCount: 195, isAvailable: true, avatar: "LO", bio: "Focado nas tendências de cortes atuais e coloração" },
];

const TODAY = new Date();
const fmt = (d: Date) => d.toISOString().split("T")[0];

const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: "a1", clientId: "client-001", clientName: "João Silva",
    professionalId: "p1", professionalName: "Rafael Mendes",
    services: [INITIAL_SERVICES[0]],
    date: fmt(new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + 1)),
    time: "09:00", totalPrice: 45, totalDuration: 30, status: "confirmed",
    createdAt: new Date().toISOString(),
  },
  {
    id: "a2", clientId: "client-001", clientName: "João Silva",
    professionalId: "p2", professionalName: "Diego Santos",
    services: [INITIAL_SERVICES[2]],
    date: fmt(new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() - 7)),
    time: "14:00", totalPrice: 70, totalDuration: 50, status: "completed",
    paymentMethod: "PIX", createdAt: new Date(TODAY.getTime() - 7 * 86400000).toISOString(),
  },
  {
    id: "a3", clientId: "client-002", clientName: "Marcos Pereira",
    professionalId: "p1", professionalName: "Rafael Mendes",
    services: [INITIAL_SERVICES[0], INITIAL_SERVICES[1]],
    date: fmt(TODAY), time: "11:00", totalPrice: 80, totalDuration: 55, status: "confirmed",
    createdAt: new Date().toISOString(),
  },
  {
    id: "a4", clientId: "client-003", clientName: "Bruno Lima",
    professionalId: "p3", professionalName: "Lucas Oliveira",
    services: [INITIAL_SERVICES[0]],
    date: fmt(TODAY), time: "15:30", totalPrice: 45, totalDuration: 30, status: "pending",
    createdAt: new Date().toISOString(),
  },
];

const INITIAL_CLIENTS: Client[] = [
  { id: "client-001", name: "João Silva", phone: "(11) 98765-4321", email: "joao@email.com", totalSpent: 420, appointmentsCount: 8, lastVisit: fmt(new Date(TODAY.getTime() - 7 * 86400000)), loyaltyPoints: 4, notes: "Prefere corte máquina 2 na lateral" },
  { id: "client-002", name: "Marcos Pereira", phone: "(11) 97654-3210", email: "marcos@email.com", totalSpent: 680, appointmentsCount: 12, lastVisit: fmt(TODAY), loyaltyPoints: 7 },
  { id: "client-003", name: "Bruno Lima", phone: "(11) 96543-2109", email: "bruno@email.com", totalSpent: 315, appointmentsCount: 6, lastVisit: fmt(new Date(TODAY.getTime() - 14 * 86400000)), loyaltyPoints: 3 },
  { id: "client-004", name: "André Costa", phone: "(11) 95432-1098", email: "andre@email.com", totalSpent: 920, appointmentsCount: 18, lastVisit: fmt(new Date(TODAY.getTime() - 3 * 86400000)), loyaltyPoints: 9, notes: "Cliente VIP" },
  { id: "client-005", name: "Pedro Souza", phone: "(11) 94321-0987", email: "pedro@email.com", totalSpent: 180, appointmentsCount: 4, lastVisit: fmt(new Date(TODAY.getTime() - 30 * 86400000)), loyaltyPoints: 2 },
];

const INITIAL_CASH: CashEntry[] = [
  { id: "c1", description: "Corte + Barba - Marcos", amount: 80, type: "income", category: "Serviço", paymentMethod: "PIX", date: fmt(TODAY), professionalName: "Rafael Mendes" },
  { id: "c2", description: "Corte - André", amount: 45, type: "income", category: "Serviço", paymentMethod: "Dinheiro", date: fmt(TODAY), professionalName: "Diego Santos" },
  { id: "c3", description: "Produtos de cabelo", amount: 180, type: "expense", category: "Produto", paymentMethod: "Cartão de Débito", date: fmt(TODAY) },
];

// Per-client loyalty data — keyed by clientId
const INITIAL_LOYALTY_MAP: Record<string, ClientLoyalty> = {
  "client-001": {
    currentPoints: 4,
    history: [
      { id: "l1", date: fmt(new Date(TODAY.getTime() - 7 * 86400000)), points: 1, description: "Corte + Barba realizado", type: "earned" },
      { id: "l2", date: fmt(new Date(TODAY.getTime() - 21 * 86400000)), points: 1, description: "Corte de Cabelo realizado", type: "earned" },
      { id: "l3", date: fmt(new Date(TODAY.getTime() - 35 * 86400000)), points: 1, description: "Corte + Barba realizado", type: "earned" },
      { id: "l4", date: fmt(new Date(TODAY.getTime() - 49 * 86400000)), points: 1, description: "Corte de Cabelo realizado", type: "earned" },
    ],
  },
  "client-002": { currentPoints: 7, history: [
    { id: "lm1", date: fmt(new Date(TODAY.getTime() - 5 * 86400000)), points: 1, description: "Corte + Barba realizado", type: "earned" },
    { id: "lm2", date: fmt(new Date(TODAY.getTime() - 18 * 86400000)), points: 1, description: "Corte realizado", type: "earned" },
    { id: "lm3", date: fmt(new Date(TODAY.getTime() - 30 * 86400000)), points: 5, description: "Ajuste de pontos", type: "adjusted" },
  ]},
  "client-003": { currentPoints: 3, history: [
    { id: "lb1", date: fmt(new Date(TODAY.getTime() - 14 * 86400000)), points: 3, description: "Cortes realizados", type: "earned" },
  ]},
  "client-004": { currentPoints: 9, history: [
    { id: "la1", date: fmt(new Date(TODAY.getTime() - 3 * 86400000)), points: 1, description: "Corte realizado", type: "earned" },
    { id: "la2", date: fmt(new Date(TODAY.getTime() - 12 * 86400000)), points: 8, description: "Pontos acumulados", type: "adjusted" },
  ]},
  "client-005": { currentPoints: 2, history: [
    { id: "lp1", date: fmt(new Date(TODAY.getTime() - 30 * 86400000)), points: 2, description: "Cortes realizados", type: "earned" },
  ]},
};

const INITIAL_LOYALTY_SETTINGS: LoyaltySettings = {
  requiredPoints: 10,
  benefitDescription: "Corte de cabelo gratuito",
};

const WORK_HOURS = [
  "08:00","08:30","09:00","09:30","10:00","10:30",
  "11:00","11:30","14:00","14:30","15:00","15:30",
  "16:00","16:30","17:00","17:30","18:00","18:30",
];

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [services, setServices] = useState<Service[]>(INITIAL_SERVICES);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [professionals] = useState<Professional[]>(INITIAL_PROFESSIONALS);
  const [appointments, setAppointments] = useState<Appointment[]>(INITIAL_APPOINTMENTS);
  const [clients, setClients] = useState<Client[]>(INITIAL_CLIENTS);
  const [cashEntries, setCashEntries] = useState<CashEntry[]>(INITIAL_CASH);
  const [loyaltyMap, setLoyaltyMap] = useState<Record<string, ClientLoyalty>>(INITIAL_LOYALTY_MAP);
  const [loyaltySettings, setLoyaltySettings] = useState<LoyaltySettings>(INITIAL_LOYALTY_SETTINGS);

  const getClientLoyalty = (clientId: string): LoyaltyInfo => {
    const entry = loyaltyMap[clientId] ?? { currentPoints: 0, history: [] };
    return {
      currentPoints: entry.currentPoints,
      requiredPoints: loyaltySettings.requiredPoints,
      benefitDescription: loyaltySettings.benefitDescription,
      history: entry.history,
    };
  };

  const addAppointment = async (apt: Appointment) => {
    setAppointments((prev) => [apt, ...prev]);
  };

  const updateAppointmentStatus = async (
    id: string,
    status: Appointment["status"],
    paymentMethod?: string
  ) => {
    let completedApt: Appointment | undefined;
    setAppointments((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          completedApt = { ...a, status, ...(paymentMethod ? { paymentMethod } : {}) };
          return completedApt;
        }
        return a;
      })
    );

    if (status === "completed" && completedApt) {
      const { clientId, clientName } = completedApt;
      // Award 1 loyalty point to the specific client
      setLoyaltyMap((prev) => {
        const existing = prev[clientId] ?? { currentPoints: 0, history: [] };
        const newPoints = Math.min(
          existing.currentPoints + 1,
          loyaltySettings.requiredPoints
        );
        return {
          ...prev,
          [clientId]: {
            currentPoints: newPoints,
            history: [
              {
                id: Date.now().toString(),
                date: fmt(new Date()),
                points: 1,
                description: `Atendimento concluído`,
                type: "earned" as const,
              },
              ...existing.history,
            ],
          },
        };
      });
      // Update clients table loyalty points
      setClients((prev) =>
        prev.map((c) =>
          c.id === clientId
            ? { ...c, loyaltyPoints: Math.min(c.loyaltyPoints + 1, loyaltySettings.requiredPoints), lastVisit: fmt(new Date()) }
            : c
        )
      );
    }
  };

  const cancelAppointment = async (id: string) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "cancelled" } : a))
    );
  };

  const addService = async (s: Service) => setServices((prev) => [...prev, s]);
  const updateService = async (s: Service) => setServices((prev) => prev.map((sv) => sv.id === s.id ? s : sv));

  const addProduct = async (p: Product) => setProducts((prev) => [...prev, p]);
  const updateProduct = async (p: Product) => setProducts((prev) => prev.map((pr) => pr.id === p.id ? p : pr));

  const addCashEntry = async (e: CashEntry) => setCashEntries((prev) => [e, ...prev]);

  const updateLoyaltySettings = async (s: LoyaltySettings) => setLoyaltySettings(s);

  const adjustClientLoyalty = async (clientId: string, points: number, description: string) => {
    setLoyaltyMap((prev) => {
      const existing = prev[clientId] ?? { currentPoints: 0, history: [] };
      const newPoints = Math.max(0, Math.min(existing.currentPoints + points, loyaltySettings.requiredPoints));
      return {
        ...prev,
        [clientId]: {
          currentPoints: newPoints,
          history: [
            {
              id: Date.now().toString(),
              date: fmt(new Date()),
              points: Math.abs(points),
              description,
              type: points >= 0 ? ("adjusted" as const) : ("redeemed" as const),
            },
            ...existing.history,
          ],
        },
      };
    });
    setClients((prev) =>
      prev.map((c) =>
        c.id === clientId
          ? { ...c, loyaltyPoints: Math.max(0, Math.min(c.loyaltyPoints + points, loyaltySettings.requiredPoints)) }
          : c
      )
    );
  };

  const getClientAppointments = (clientId: string) =>
    appointments.filter((a) => a.clientId === clientId);

  const getAvailableSlots = (date: string, professionalId: string, duration: number): string[] => {
    const booked = appointments
      .filter((a) => a.date === date && a.professionalId === professionalId && a.status !== "cancelled")
      .map((a) => a.time);
    return WORK_HOURS.filter((slot) => !booked.includes(slot));
  };

  return (
    <DataContext.Provider
      value={{
        services, products, professionals, appointments, clients, cashEntries,
        loyaltySettings, addAppointment, updateAppointmentStatus, cancelAppointment,
        addService, updateService, addProduct, updateProduct, addCashEntry,
        updateLoyaltySettings, getClientLoyalty, adjustClientLoyalty,
        getClientAppointments, getAvailableSlots,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
