export const DEFAULT_PAID_PLAN = "base";
export const LEGACY_PREMIUM_PLAN = "premium";
export const LEGACY_PREMIUM_PRICE_CENTS = 5900;
export const PAYMENT_PENDING_PLAN = "pending";

export const PAID_PLANS = {
  base: {
    key: "base",
    name: "Base",
    priceLabel: "R$59,90",
    priceCents: 5990,
    productName: "Marcae Base",
    description: "Agenda online, 2 profissionais, 1 login de funcionario, financeiro essencial e fidelidade.",
  },
  medio: {
    key: "medio",
    name: "Medio",
    priceLabel: "R$89,90",
    priceCents: 8990,
    productName: "Marcae Medio",
    description: "Plano com 6 profissionais, 6 logins de funcionarios, comissoes, notificacoes e relatorios.",
  },
  super: {
    key: "super",
    name: "Super",
    priceLabel: "R$129,90",
    priceCents: 12990,
    productName: "Marcae Super",
    description: "Plano completo com 20 profissionais, onboarding assistido, acompanhamento e prioridade maxima.",
  },
} as const;

export type PaidPlanKey = keyof typeof PAID_PLANS;
export type ActivePaidPlanKey = PaidPlanKey | typeof LEGACY_PREMIUM_PLAN;
export type InactiveSubscriptionPlanKey = typeof PAYMENT_PENDING_PLAN | "expired";
export type SubscriptionPlanKey = "trial" | ActivePaidPlanKey | InactiveSubscriptionPlanKey;
export type PlanFeature = "team" | "commissions" | "notifications" | "reports" | "advancedReports";
export interface PlanLimits {
  professionals: number;
  employeeLogins: number;
}

const PLAN_LIMITS: Record<PaidPlanKey | "trial" | typeof LEGACY_PREMIUM_PLAN | InactiveSubscriptionPlanKey, PlanLimits> = {
  trial: { professionals: 20, employeeLogins: 20 },
  base: { professionals: 2, employeeLogins: 1 },
  medio: { professionals: 6, employeeLogins: 6 },
  super: { professionals: 20, employeeLogins: 20 },
  premium: { professionals: 2, employeeLogins: 1 },
  pending: { professionals: 0, employeeLogins: 0 },
  expired: { professionals: 0, employeeLogins: 0 },
};

export function isPaidPlanKey(plan: unknown): plan is PaidPlanKey {
  return typeof plan === "string" && Object.prototype.hasOwnProperty.call(PAID_PLANS, plan);
}

export function isPaidPlan(plan: unknown): plan is ActivePaidPlanKey {
  return plan === LEGACY_PREMIUM_PLAN || isPaidPlanKey(plan);
}

export function normalizePaidPlan(plan: unknown): PaidPlanKey {
  return isPaidPlanKey(plan) ? plan : DEFAULT_PAID_PLAN;
}

export function getPaidPlanName(plan: unknown): string {
  if (plan === LEGACY_PREMIUM_PLAN) return "Premium";
  return PAID_PLANS[normalizePaidPlan(plan)].name;
}

export function getPaidPlanPriceLabel(plan: unknown): string {
  if (plan === LEGACY_PREMIUM_PLAN) return "R$59,00";
  return PAID_PLANS[normalizePaidPlan(plan)].priceLabel;
}

export function paidPlanRank(plan: unknown): number {
  if (plan === "trial") return 3;
  if (plan === "super") return 3;
  if (plan === "medio") return 2;
  if (plan === "base" || plan === LEGACY_PREMIUM_PLAN) return 1;
  return 0;
}

export function getPlanLimits(plan: unknown): PlanLimits {
  if (plan === "trial") return PLAN_LIMITS.trial;
  if (plan === LEGACY_PREMIUM_PLAN) return PLAN_LIMITS[LEGACY_PREMIUM_PLAN];
  if (plan === PAYMENT_PENDING_PLAN) return PLAN_LIMITS[PAYMENT_PENDING_PLAN];
  if (plan === "expired") return PLAN_LIMITS.expired;
  return PLAN_LIMITS[normalizePaidPlan(plan)];
}

export function planHasFeature(plan: unknown, feature: PlanFeature): boolean {
  const rank = paidPlanRank(plan);
  if (feature === "advancedReports") return rank >= 3;
  if (feature === "team") return rank >= 1;
  if (feature === "commissions" || feature === "notifications" || feature === "reports") {
    return rank >= 2;
  }
  return rank >= 1;
}

export function planFeatureFlags(plan: unknown) {
  return {
    team: planHasFeature(plan, "team"),
    commissions: planHasFeature(plan, "commissions"),
    notifications: planHasFeature(plan, "notifications"),
    reports: planHasFeature(plan, "reports"),
    advancedReports: planHasFeature(plan, "advancedReports"),
    limits: getPlanLimits(plan),
  };
}

function metadataPlan(metadata: unknown): PaidPlanKey | null {
  const plan = (metadata as { plan?: unknown } | null | undefined)?.plan;
  return isPaidPlanKey(plan) ? plan : null;
}

export function paidPlanFromStripeSubscription(raw: unknown): ActivePaidPlanKey {
  const sub = raw as {
    metadata?: Record<string, unknown> | null;
    subscription_details?: { metadata?: Record<string, unknown> | null } | null;
    items?: {
      data?: Array<{
        price?: {
          metadata?: Record<string, unknown> | null;
          unit_amount?: number | null;
        } | null;
      }>;
    } | null;
    lines?: {
      data?: Array<{
        price?: {
          metadata?: Record<string, unknown> | null;
          unit_amount?: number | null;
        } | null;
      }>;
    } | null;
  } | null;

  const subPlan = metadataPlan(sub?.metadata);
  if (subPlan) return subPlan;

  const subscriptionDetailsPlan = metadataPlan(sub?.subscription_details?.metadata);
  if (subscriptionDetailsPlan) return subscriptionDetailsPlan;

  const price = sub?.items?.data?.[0]?.price;
  const pricePlan = metadataPlan(price?.metadata);
  if (pricePlan) return pricePlan;

  const invoiceLinePrice = sub?.lines?.data?.[0]?.price;
  const invoiceLinePlan = metadataPlan(invoiceLinePrice?.metadata);
  if (invoiceLinePlan) return invoiceLinePlan;

  const amount = price?.unit_amount ?? invoiceLinePrice?.unit_amount;
  const planByAmount = Object.values(PAID_PLANS).find((plan) => plan.priceCents === amount);
  if (planByAmount) return planByAmount.key;
  if (amount === LEGACY_PREMIUM_PRICE_CENTS) return LEGACY_PREMIUM_PLAN;

  return LEGACY_PREMIUM_PLAN;
}

export function subscriptionStateFromStripeStatus(status: unknown): ActivePaidPlanKey | InactiveSubscriptionPlanKey {
  if (status === "active" || status === "trialing") return DEFAULT_PAID_PLAN;
  if (status === "incomplete" || status === "past_due" || status === "unpaid") return PAYMENT_PENDING_PLAN;
  return "expired";
}

export function subscriptionStateFromStripeSubscription(raw: unknown): ActivePaidPlanKey | InactiveSubscriptionPlanKey {
  const status = (raw as { status?: unknown } | null | undefined)?.status;
  if (status === "active" || status === "trialing") return paidPlanFromStripeSubscription(raw);
  return subscriptionStateFromStripeStatus(status);
}
