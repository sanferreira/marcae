import type {
  Barbershop, User, Service, Product, Professional, Client,
  Appointment, AppointmentService, CashEntry, LoyaltySettings, LoyaltyMovement,
} from "@workspace/db";

const num = (v: string | number | null | undefined): number => {
  if (v == null) return 0;
  return typeof v === "string" ? parseFloat(v) : v;
};
const iso = (d: Date | string | null | undefined): string => {
  if (!d) return "";
  return d instanceof Date ? d.toISOString() : new Date(d).toISOString();
};
const isoOrNull = (d: Date | string | null | undefined): string | null => {
  if (!d) return null;
  return d instanceof Date ? d.toISOString() : new Date(d).toISOString();
};

export function computePlanStatus(b: Barbershop) {
  const trialEndsAt = b.trialEndsAt instanceof Date ? b.trialEndsAt : new Date(b.trialEndsAt);
  if (b.plan === "premium") {
    if (b.subscriptionRenewsAt) {
      const renews = b.subscriptionRenewsAt instanceof Date ? b.subscriptionRenewsAt : new Date(b.subscriptionRenewsAt);
      if (renews.getTime() < Date.now()) {
        return { plan: "expired" as const, trialDaysLeft: 0, isActive: false, isPremium: false, trialEndsAt: trialEndsAt.toISOString() };
      }
    }
    return { plan: "premium" as const, trialDaysLeft: 0, isActive: true, isPremium: true, trialEndsAt: trialEndsAt.toISOString() };
  }
  if (b.plan === "expired") {
    return { plan: "expired" as const, trialDaysLeft: 0, isActive: false, isPremium: false, trialEndsAt: trialEndsAt.toISOString() };
  }
  const msLeft = trialEndsAt.getTime() - Date.now();
  const daysLeft = Math.max(0, Math.ceil(msLeft / 86400000));
  if (daysLeft <= 0) {
    return { plan: "expired" as const, trialDaysLeft: 0, isActive: false, isPremium: false, trialEndsAt: trialEndsAt.toISOString() };
  }
  return { plan: "trial" as const, trialDaysLeft: daysLeft, isActive: true, isPremium: false, trialEndsAt: trialEndsAt.toISOString() };
}

export function serializeBarbershop(b: Barbershop) {
  return {
    id: b.id, slug: b.slug, name: b.name,
    ownerName: b.ownerName, ownerEmail: b.ownerEmail,
    phone: b.phone, address: b.address,
    plan: b.plan as "trial" | "premium" | "expired",
    trialEndsAt: iso(b.trialEndsAt),
    subscriptionRenewsAt: isoOrNull(b.subscriptionRenewsAt),
    createdAt: iso(b.createdAt),
  };
}

export function serializeUser(u: User) {
  return {
    id: u.id, barbershopId: u.barbershopId,
    role: u.role as "admin" | "employee" | "client",
    name: u.name, email: u.email, phone: u.phone,
    professionalId: u.professionalId, clientId: u.clientId,
    createdAt: iso(u.createdAt),
  };
}

export const slugify = (s: string): string =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

export function serializeService(s: Service) {
  return {
    id: s.id, barbershopId: s.barbershopId,
    name: s.name, price: num(s.price), duration: s.duration,
    description: s.description, category: s.category, isActive: s.isActive,
  };
}

export function serializeProduct(p: Product) {
  return {
    id: p.id, barbershopId: p.barbershopId,
    name: p.name, price: num(p.price), costPrice: num(p.costPrice),
    stock: p.stock, category: p.category, description: p.description, isActive: p.isActive,
  };
}

export function serializeProfessional(p: Professional) {
  return {
    id: p.id, barbershopId: p.barbershopId,
    name: p.name, specialty: p.specialty, rating: num(p.rating),
    appointmentsCount: p.appointmentsCount, isAvailable: p.isAvailable,
    avatar: p.avatar, bio: p.bio, phone: p.phone ?? undefined, email: p.email ?? undefined,
    commissionRate: p.commissionRate,
    schedule: p.schedule,
  };
}

export function serializeClient(c: Client) {
  return {
    id: c.id, barbershopId: c.barbershopId,
    name: c.name, phone: c.phone, email: c.email,
    birthDate: c.birthDate ?? undefined,
    totalSpent: num(c.totalSpent),
    appointmentsCount: c.appointmentsCount,
    lastVisit: c.lastVisit ?? undefined,
    loyaltyPoints: c.loyaltyPoints,
    notes: c.notes ?? undefined,
  };
}

export function serializeAppointment(a: Appointment, services: AppointmentService[]) {
  return {
    id: a.id, barbershopId: a.barbershopId,
    clientId: a.clientId, clientName: a.clientName,
    professionalId: a.professionalId, professionalName: a.professionalName,
    services: services.map((s) => ({
      id: s.serviceId,
      name: s.serviceName,
      price: num(s.servicePrice),
      duration: s.serviceDuration,
      barbershopId: a.barbershopId,
      description: "", category: "", isActive: true,
    })),
    date: a.date, time: a.time,
    totalPrice: num(a.totalPrice),
    totalDuration: a.totalDuration,
    status: a.status as "pending" | "confirmed" | "completed" | "cancelled",
    paymentMethod: a.paymentMethod ?? undefined,
    isFreeByLoyalty: a.isFreeByLoyalty,
    createdAt: iso(a.createdAt),
  };
}

export function serializeCashEntry(c: CashEntry) {
  return {
    id: c.id, barbershopId: c.barbershopId,
    description: c.description, amount: num(c.amount),
    type: c.type as "income" | "expense",
    category: c.category, paymentMethod: c.paymentMethod, date: c.date,
    professionalId: c.professionalId ?? undefined,
    professionalName: c.professionalName ?? undefined,
  };
}

export function serializeLoyaltySettings(s: LoyaltySettings) {
  return { requiredPoints: s.requiredPoints, benefitDescription: s.benefitDescription };
}

export function serializeLoyaltyMovement(m: LoyaltyMovement) {
  return {
    id: m.id, date: m.date, points: m.points,
    description: m.description, type: m.type as "earned" | "redeemed" | "adjusted",
  };
}
