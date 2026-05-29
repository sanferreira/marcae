import type {
  Barbershop, User, Service, Product, Professional, Client,
  Appointment, AppointmentService, CashEntry, LoyaltySettings, LoyaltyMovement,
  Category, ProductOrder, ProductOrderItem, ServicePackage, ClientPackage,
} from "@workspace/db";
import {
  PAYMENT_PENDING_PLAN,
  type SubscriptionPlanKey,
  getPaidPlanName,
  getPaidPlanPriceLabel,
  isPaidPlan,
  planFeatureFlags,
} from "./plans";

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
type ScheduleRecord = Record<string, { enabled: boolean; startTime: string; endTime: string }>;
const DEFAULT_BUSINESS_SCHEDULE: ScheduleRecord = {
  seg: { enabled: true, startTime: "08:00", endTime: "18:00" },
  ter: { enabled: true, startTime: "08:00", endTime: "18:00" },
  qua: { enabled: true, startTime: "08:00", endTime: "18:00" },
  qui: { enabled: true, startTime: "08:00", endTime: "18:00" },
  sex: { enabled: true, startTime: "08:00", endTime: "18:00" },
  sab: { enabled: true, startTime: "08:00", endTime: "13:00" },
  dom: { enabled: false, startTime: "08:00", endTime: "12:00" },
};
const DEFAULT_INTAKE_FIELDS = [
  { key: "goal", label: "Objetivo do atendimento", type: "textarea" },
  { key: "reference", label: "Referencia ou preferencia", type: "textarea" },
  { key: "care", label: "Cuidados ou observacoes", type: "textarea" },
] as const;

function safeRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function normalizeIntakeFields(value: unknown) {
  const source = Array.isArray(value) ? value : DEFAULT_INTAKE_FIELDS;
  return source
    .map((field, index) => {
      const data = safeRecord(field);
      const label = typeof data.label === "string" && data.label.trim() ? data.label.trim() : `Campo ${index + 1}`;
      const rawKey = typeof data.key === "string" ? data.key : label;
      const key = slugify(rawKey) || `campo_${index + 1}`;
      const type = data.type === "date" || data.type === "phone" || data.type === "textarea" ? data.type : "text";
      return { key, label, type };
    })
    .filter((field, index, fields) => fields.findIndex((item) => item.key === field.key) === index)
    .slice(0, 12);
}

export function computePlanStatus(b: Barbershop) {
  const trialEndsAt = b.trialEndsAt instanceof Date ? b.trialEndsAt : new Date(b.trialEndsAt);
  if (isPaidPlan(b.plan)) {
    if (b.subscriptionRenewsAt) {
      const renews = b.subscriptionRenewsAt instanceof Date ? b.subscriptionRenewsAt : new Date(b.subscriptionRenewsAt);
      if (renews.getTime() < Date.now()) {
        return {
          plan: "expired" as const,
          trialDaysLeft: 0,
          isActive: false,
          isPremium: false,
          isPaid: false,
          planName: "Expirado",
          planPrice: null,
          trialEndsAt: trialEndsAt.toISOString(),
          features: planFeatureFlags("expired"),
        };
      }
    }
    return {
      plan: b.plan,
      trialDaysLeft: 0,
      isActive: true,
      isPremium: true,
      isPaid: true,
      planName: getPaidPlanName(b.plan),
      planPrice: getPaidPlanPriceLabel(b.plan),
      trialEndsAt: trialEndsAt.toISOString(),
      features: planFeatureFlags(b.plan),
    };
  }
  if (b.plan === "expired") {
    return {
      plan: "expired" as const,
      trialDaysLeft: 0,
      isActive: false,
      isPremium: false,
      isPaid: false,
      planName: "Expirado",
      planPrice: null,
      trialEndsAt: trialEndsAt.toISOString(),
      features: planFeatureFlags("expired"),
    };
  }
  if (b.plan === PAYMENT_PENDING_PLAN) {
    return {
      plan: PAYMENT_PENDING_PLAN,
      trialDaysLeft: 0,
      isActive: false,
      isPremium: false,
      isPaid: false,
      planName: "Pagamento pendente",
      planPrice: null,
      trialEndsAt: trialEndsAt.toISOString(),
      features: planFeatureFlags(PAYMENT_PENDING_PLAN),
    };
  }
  const msLeft = trialEndsAt.getTime() - Date.now();
  const daysLeft = Math.max(0, Math.ceil(msLeft / 86400000));
  if (daysLeft <= 0) {
    return {
      plan: "expired" as const,
      trialDaysLeft: 0,
      isActive: false,
      isPremium: false,
      isPaid: false,
      planName: "Expirado",
      planPrice: null,
      trialEndsAt: trialEndsAt.toISOString(),
      features: planFeatureFlags("expired"),
    };
  }
  return {
    plan: "trial" as const,
    trialDaysLeft: daysLeft,
    isActive: true,
    isPremium: false,
    isPaid: false,
    planName: "Trial gratuito",
    planPrice: null,
    trialEndsAt: trialEndsAt.toISOString(),
    features: planFeatureFlags("trial"),
  };
}

export function serializeBarbershop(b: Barbershop) {
  const bookingAvailabilityMode =
    (b as Barbershop & { bookingAvailabilityMode?: string }).bookingAvailabilityMode ?? "duration_buffer";
  return {
    id: b.id, slug: b.slug, name: b.name,
    ownerName: b.ownerName, ownerEmail: b.ownerEmail,
    phone: b.phone, address: b.address,
    plan: b.plan as SubscriptionPlanKey,
    trialEndsAt: iso(b.trialEndsAt),
    subscriptionRenewsAt: isoOrNull(b.subscriptionRenewsAt),
    brandPrimary: b.brandPrimary,
    brandAccent: b.brandAccent,
    bookingBufferMinutes: b.bookingBufferMinutes,
    bookingAvailabilityMode: bookingAvailabilityMode as "duration_buffer" | "release_on_complete",
    businessSchedule: (b as Barbershop & { businessSchedule?: ScheduleRecord | null }).businessSchedule ?? DEFAULT_BUSINESS_SCHEDULE,
    intakeFields: normalizeIntakeFields((b as Barbershop & { intakeFields?: unknown }).intakeFields),
    createdAt: iso(b.createdAt),
  };
}

export function serializeUser(u: User) {
  return {
    id: u.id, barbershopId: u.barbershopId,
    role: u.role as "admin" | "employee" | "client",
    name: u.name, email: u.email, phone: u.phone,
    avatarImage: u.avatarImage,
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
    loyaltyPoints: (s as Service & { loyaltyPoints?: number }).loyaltyPoints ?? 1,
    description: s.description, category: s.category, isActive: s.isActive,
    imageUrl: (s as Service & { imageUrl?: string | null }).imageUrl ?? null,
  };
}

export function serializeProduct(p: Product) {
  return {
    id: p.id, barbershopId: p.barbershopId,
    name: p.name, price: num(p.price), costPrice: num(p.costPrice),
    stock: p.stock, category: p.category, description: p.description, isActive: p.isActive,
  };
}

export function serializeCategory(c: Category) {
  return {
    id: c.id,
    barbershopId: c.barbershopId,
    type: c.type as "service" | "product" | "income" | "expense",
    name: c.name,
    createdAt: iso(c.createdAt),
  };
}

export function serializeProfessional(p: Professional, serviceIds: string[] = []) {
  return {
    id: p.id, barbershopId: p.barbershopId,
    name: p.name, specialty: p.specialty, rating: num(p.rating),
    appointmentsCount: p.appointmentsCount, isAvailable: p.isAvailable,
    avatar: p.avatar, avatarImage: p.avatarImage ?? undefined, bio: p.bio, phone: p.phone ?? undefined, email: p.email ?? undefined,
    commissionRate: p.commissionRate,
    serviceIds,
    schedule: p.schedule,
  };
}

export function serializeClient(c: Client) {
  return {
    id: c.id, barbershopId: c.barbershopId,
    userId: c.userId ?? null,
    hasAccess: !!c.userId,
    name: c.name, phone: c.phone, email: c.email,
    birthDate: c.birthDate ?? undefined,
    totalSpent: num(c.totalSpent),
    appointmentsCount: c.appointmentsCount,
    lastVisit: c.lastVisit ?? undefined,
    archivedAt: c.archivedAt?.toISOString(),
    loyaltyPoints: c.loyaltyPoints,
    notes: c.notes ?? undefined,
    allergies: (c as Client & { allergies?: string }).allergies ?? "",
    restrictions: (c as Client & { restrictions?: string }).restrictions ?? "",
    preferences: (c as Client & { preferences?: string }).preferences ?? "",
    emergencyContact: (c as Client & { emergencyContact?: string }).emergencyContact ?? "",
    intakeData: (c as Client & { intakeData?: Record<string, string> | null }).intakeData ?? {},
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
      loyaltyPoints: 1,
      description: "", category: "", isActive: true,
    })),
    date: a.date, time: a.time,
    totalPrice: num(a.totalPrice),
    totalDuration: a.totalDuration,
    status: a.status as "pending" | "confirmed" | "completed" | "cancelled",
    paymentMethod: a.paymentMethod ?? undefined,
    isFreeByLoyalty: a.isFreeByLoyalty,
    clientNotes: (a as Appointment & { clientNotes?: string }).clientNotes ?? "",
    professionalNotes: (a as Appointment & { professionalNotes?: string }).professionalNotes ?? "",
    createdAt: iso(a.createdAt),
  };
}

export function serializeServicePackage(p: ServicePackage) {
  return {
    id: p.id,
    barbershopId: p.barbershopId,
    serviceId: p.serviceId ?? undefined,
    name: p.name,
    description: p.description,
    sessionsTotal: p.sessionsTotal,
    price: num(p.price),
    validityDays: p.validityDays,
    isActive: p.isActive,
    createdAt: iso(p.createdAt),
  };
}

export function serializeClientPackage(p: ClientPackage) {
  return {
    id: p.id,
    barbershopId: p.barbershopId,
    clientId: p.clientId,
    packageId: p.packageId ?? undefined,
    serviceId: p.serviceId ?? undefined,
    packageName: p.packageName,
    serviceName: p.serviceName,
    sessionsTotal: p.sessionsTotal,
    sessionsUsed: p.sessionsUsed,
    sessionsRemaining: Math.max(0, p.sessionsTotal - p.sessionsUsed),
    pricePaid: num(p.pricePaid),
    expiresAt: p.expiresAt ?? undefined,
    status: p.status as "active" | "used" | "expired" | "cancelled",
    createdAt: iso(p.createdAt),
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

export function serializeProductOrder(o: ProductOrder, items: ProductOrderItem[]) {
  return {
    id: o.id,
    barbershopId: o.barbershopId,
    clientId: o.clientId,
    appointmentId: o.appointmentId ?? undefined,
    clientName: o.clientName,
    status: o.status as "pending" | "paid" | "delivered" | "cancelled",
    totalPrice: num(o.totalPrice),
    paymentMethod: o.paymentMethod ?? undefined,
    notes: o.notes,
    createdAt: iso(o.createdAt),
    items: items.map((item) => ({
      id: item.id,
      orderId: item.orderId,
      productId: item.productId,
      productName: item.productName,
      unitPrice: num(item.unitPrice),
      quantity: item.quantity,
    })),
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
