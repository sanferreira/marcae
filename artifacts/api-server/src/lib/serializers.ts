import type { Barbershop, User } from "@workspace/db";

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
    id: b.id,
    slug: b.slug,
    name: b.name,
    ownerName: b.ownerName,
    ownerEmail: b.ownerEmail,
    phone: b.phone,
    address: b.address,
    plan: b.plan as "trial" | "premium" | "expired",
    trialEndsAt: (b.trialEndsAt instanceof Date ? b.trialEndsAt : new Date(b.trialEndsAt)).toISOString(),
    subscriptionRenewsAt: b.subscriptionRenewsAt
      ? (b.subscriptionRenewsAt instanceof Date ? b.subscriptionRenewsAt : new Date(b.subscriptionRenewsAt)).toISOString()
      : null,
    createdAt: (b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt)).toISOString(),
  };
}

export function serializeUser(u: User) {
  return {
    id: u.id,
    barbershopId: u.barbershopId,
    role: u.role as "admin" | "employee" | "client",
    name: u.name,
    email: u.email,
    phone: u.phone,
    professionalId: u.professionalId,
    clientId: u.clientId,
    createdAt: (u.createdAt instanceof Date ? u.createdAt : new Date(u.createdAt)).toISOString(),
  };
}

export const slugify = (s: string): string =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
