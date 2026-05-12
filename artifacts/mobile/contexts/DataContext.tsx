import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

export interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  description: string;
  category: string;
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

export interface LoyaltyInfo {
  currentPoints: number;
  requiredPoints: number;
  benefitDescription: string;
  history: LoyaltyMovement[];
}

export interface LoyaltyMovement {
  id: string;
  date: string;
  points: number;
  description: string;
  type: "earned" | "redeemed" | "adjusted";
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
  professionals: Professional[];
  appointments: Appointment[];
  clients: Client[];
  cashEntries: CashEntry[];
  loyaltyInfo: LoyaltyInfo;
  addAppointment: (apt: Appointment) => Promise<void>;
  updateAppointmentStatus: (
    id: string,
    status: Appointment["status"],
    paymentMethod?: string
  ) => Promise<void>;
  cancelAppointment: (id: string) => Promise<void>;
  addService: (s: Service) => Promise<void>;
  updateService: (s: Service) => Promise<void>;
  addCashEntry: (e: CashEntry) => Promise<void>;
  getClientAppointments: (clientId: string) => Appointment[];
  getAvailableSlots: (
    date: string,
    professionalId: string,
    duration: number
  ) => string[];
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const INITIAL_SERVICES: Service[] = [
  {
    id: "s1",
    name: "Corte de Cabelo",
    price: 45,
    duration: 30,
    description: "Corte clássico ou moderno conforme sua preferência",
    category: "Cabelo",
    isActive: true,
  },
  {
    id: "s2",
    name: "Barba",
    price: 35,
    duration: 25,
    description: "Aparagem e modelagem de barba com toalha quente",
    category: "Barba",
    isActive: true,
  },
  {
    id: "s3",
    name: "Corte + Barba",
    price: 70,
    duration: 50,
    description: "Combo completo: corte e barba com tratamento",
    category: "Combo",
    isActive: true,
  },
  {
    id: "s4",
    name: "Sobrancelha",
    price: 20,
    duration: 15,
    description: "Modelagem de sobrancelha com pinça ou navalha",
    category: "Estética",
    isActive: true,
  },
  {
    id: "s5",
    name: "Hidratação Capilar",
    price: 55,
    duration: 40,
    description: "Tratamento profundo de hidratação para os cabelos",
    category: "Tratamento",
    isActive: true,
  },
  {
    id: "s6",
    name: "Bigode",
    price: 15,
    duration: 15,
    description: "Aparagem e modelagem de bigode",
    category: "Barba",
    isActive: true,
  },
];

const INITIAL_PROFESSIONALS: Professional[] = [
  {
    id: "p1",
    name: "Rafael Mendes",
    specialty: "Cortes Clássicos",
    rating: 4.9,
    appointmentsCount: 312,
    isAvailable: true,
    avatar: "RM",
    bio: "10 anos de experiência em cortes clássicos e modernos",
  },
  {
    id: "p2",
    name: "Diego Santos",
    specialty: "Barbas & Design",
    rating: 4.8,
    appointmentsCount: 278,
    isAvailable: true,
    avatar: "DS",
    bio: "Especialista em design de barba e barbearia tradicional",
  },
  {
    id: "p3",
    name: "Lucas Oliveira",
    specialty: "Cortes Modernos",
    rating: 4.7,
    appointmentsCount: 195,
    isAvailable: true,
    avatar: "LO",
    bio: "Focado nas tendências de cortes atuais e coloração",
  },
];

const TODAY = new Date();
const fmt = (d: Date) => d.toISOString().split("T")[0];

const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: "a1",
    clientId: "client-001",
    clientName: "João Silva",
    professionalId: "p1",
    professionalName: "Rafael Mendes",
    services: [INITIAL_SERVICES[0]],
    date: fmt(new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + 1)),
    time: "09:00",
    totalPrice: 45,
    totalDuration: 30,
    status: "confirmed",
    createdAt: new Date().toISOString(),
  },
  {
    id: "a2",
    clientId: "client-001",
    clientName: "João Silva",
    professionalId: "p2",
    professionalName: "Diego Santos",
    services: [INITIAL_SERVICES[2]],
    date: fmt(new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() - 7)),
    time: "14:00",
    totalPrice: 70,
    totalDuration: 50,
    status: "completed",
    paymentMethod: "PIX",
    createdAt: new Date(TODAY.getTime() - 7 * 86400000).toISOString(),
  },
  {
    id: "a3",
    clientId: "client-002",
    clientName: "Marcos Pereira",
    professionalId: "p1",
    professionalName: "Rafael Mendes",
    services: [INITIAL_SERVICES[0], INITIAL_SERVICES[1]],
    date: fmt(new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate())),
    time: "11:00",
    totalPrice: 80,
    totalDuration: 55,
    status: "confirmed",
    createdAt: new Date().toISOString(),
  },
  {
    id: "a4",
    clientId: "client-003",
    clientName: "Bruno Lima",
    professionalId: "p3",
    professionalName: "Lucas Oliveira",
    services: [INITIAL_SERVICES[0]],
    date: fmt(new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate())),
    time: "15:30",
    totalPrice: 45,
    totalDuration: 30,
    status: "pending",
    createdAt: new Date().toISOString(),
  },
];

const INITIAL_CLIENTS: Client[] = [
  {
    id: "client-001",
    name: "João Silva",
    phone: "(11) 98765-4321",
    email: "joao@email.com",
    totalSpent: 420,
    appointmentsCount: 8,
    lastVisit: fmt(new Date(TODAY.getTime() - 7 * 86400000)),
    loyaltyPoints: 4,
    notes: "Prefere corte máquina 2 na lateral",
  },
  {
    id: "client-002",
    name: "Marcos Pereira",
    phone: "(11) 97654-3210",
    email: "marcos@email.com",
    totalSpent: 680,
    appointmentsCount: 12,
    lastVisit: fmt(TODAY),
    loyaltyPoints: 7,
  },
  {
    id: "client-003",
    name: "Bruno Lima",
    phone: "(11) 96543-2109",
    email: "bruno@email.com",
    totalSpent: 315,
    appointmentsCount: 6,
    lastVisit: fmt(new Date(TODAY.getTime() - 14 * 86400000)),
    loyaltyPoints: 3,
  },
  {
    id: "client-004",
    name: "André Costa",
    phone: "(11) 95432-1098",
    email: "andre@email.com",
    totalSpent: 920,
    appointmentsCount: 18,
    lastVisit: fmt(new Date(TODAY.getTime() - 3 * 86400000)),
    loyaltyPoints: 9,
    notes: "Cliente VIP",
  },
  {
    id: "client-005",
    name: "Pedro Souza",
    phone: "(11) 94321-0987",
    email: "pedro@email.com",
    totalSpent: 180,
    appointmentsCount: 4,
    lastVisit: fmt(new Date(TODAY.getTime() - 30 * 86400000)),
    loyaltyPoints: 2,
  },
];

const INITIAL_CASH: CashEntry[] = [
  {
    id: "c1",
    description: "Corte + Barba - Marcos",
    amount: 80,
    type: "income",
    category: "Serviço",
    paymentMethod: "PIX",
    date: fmt(TODAY),
    professionalName: "Rafael Mendes",
  },
  {
    id: "c2",
    description: "Corte - André",
    amount: 45,
    type: "income",
    category: "Serviço",
    paymentMethod: "Dinheiro",
    date: fmt(TODAY),
    professionalName: "Diego Santos",
  },
  {
    id: "c3",
    description: "Produtos de cabelo",
    amount: 180,
    type: "expense",
    category: "Produto",
    paymentMethod: "Cartão de Débito",
    date: fmt(TODAY),
  },
];

const INITIAL_LOYALTY: LoyaltyInfo = {
  currentPoints: 4,
  requiredPoints: 10,
  benefitDescription: "Corte de cabelo gratuito",
  history: [
    {
      id: "l1",
      date: fmt(new Date(TODAY.getTime() - 7 * 86400000)),
      points: 1,
      description: "Corte + Barba realizado",
      type: "earned",
    },
    {
      id: "l2",
      date: fmt(new Date(TODAY.getTime() - 21 * 86400000)),
      points: 1,
      description: "Corte de Cabelo realizado",
      type: "earned",
    },
    {
      id: "l3",
      date: fmt(new Date(TODAY.getTime() - 35 * 86400000)),
      points: 1,
      description: "Corte + Barba realizado",
      type: "earned",
    },
    {
      id: "l4",
      date: fmt(new Date(TODAY.getTime() - 49 * 86400000)),
      points: 1,
      description: "Corte de Cabelo realizado",
      type: "earned",
    },
  ],
};

const WORK_HOURS = [
  "08:00","08:30","09:00","09:30","10:00","10:30",
  "11:00","11:30","14:00","14:30","15:00","15:30",
  "16:00","16:30","17:00","17:30","18:00","18:30",
];

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [services, setServices] = useState<Service[]>(INITIAL_SERVICES);
  const [professionals] = useState<Professional[]>(INITIAL_PROFESSIONALS);
  const [appointments, setAppointments] = useState<Appointment[]>(INITIAL_APPOINTMENTS);
  const [clients] = useState<Client[]>(INITIAL_CLIENTS);
  const [cashEntries, setCashEntries] = useState<CashEntry[]>(INITIAL_CASH);
  const [loyaltyInfo, setLoyaltyInfo] = useState<LoyaltyInfo>(INITIAL_LOYALTY);

  const addAppointment = async (apt: Appointment) => {
    const updated = [apt, ...appointments];
    setAppointments(updated);
  };

  const updateAppointmentStatus = async (
    id: string,
    status: Appointment["status"],
    paymentMethod?: string
  ) => {
    setAppointments((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status, ...(paymentMethod ? { paymentMethod } : {}) } : a
      )
    );
    if (status === "completed") {
      setLoyaltyInfo((prev) => ({
        ...prev,
        currentPoints: Math.min(prev.currentPoints + 1, prev.requiredPoints),
        history: [
          {
            id: Date.now().toString(),
            date: fmt(new Date()),
            points: 1,
            description: "Atendimento concluído",
            type: "earned" as const,
          },
          ...prev.history,
        ],
      }));
    }
  };

  const cancelAppointment = async (id: string) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "cancelled" } : a))
    );
  };

  const addService = async (s: Service) => {
    setServices((prev) => [...prev, s]);
  };

  const updateService = async (s: Service) => {
    setServices((prev) => prev.map((sv) => (sv.id === s.id ? s : sv)));
  };

  const addCashEntry = async (e: CashEntry) => {
    setCashEntries((prev) => [e, ...prev]);
  };

  const getClientAppointments = (clientId: string) =>
    appointments.filter((a) => a.clientId === clientId);

  const getAvailableSlots = (
    date: string,
    professionalId: string,
    duration: number
  ): string[] => {
    const booked = appointments
      .filter(
        (a) =>
          a.date === date &&
          a.professionalId === professionalId &&
          a.status !== "cancelled"
      )
      .map((a) => a.time);

    return WORK_HOURS.filter((slot) => !booked.includes(slot));
  };

  return (
    <DataContext.Provider
      value={{
        services,
        professionals,
        appointments,
        clients,
        cashEntries,
        loyaltyInfo,
        addAppointment,
        updateAppointmentStatus,
        cancelAppointment,
        addService,
        updateService,
        addCashEntry,
        getClientAppointments,
        getAvailableSlots,
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
