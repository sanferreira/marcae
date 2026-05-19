export const DEFAULT_PAID_PLAN = "base";
export const BASE_PLAN_PRICE_LABEL = "R$59,90";
export const LEGACY_PREMIUM_PLAN = "premium";
export const PAYMENT_PENDING_PLAN = "pending";

const PAID_PLAN_DATA = {
  base: {
    key: "base",
    name: "Base",
    badge: "Essencial",
    price: BASE_PLAN_PRICE_LABEL,
    summary: "Para comecar com agenda online, clientes e controle do dia a dia.",
    features: [
      "Agenda online e painel administrativo",
      "Ate 2 profissionais na agenda",
      "1 login de funcionario",
      "Clientes e servicos sem limite",
      "Financeiro essencial",
      "Fidelidade configuravel",
      "Suporte por WhatsApp",
    ],
  },
  medio: {
    key: "medio",
    name: "Medio",
    badge: "Mais escolhido",
    price: "R$89,90",
    summary: "Para equipes que precisam acompanhar agenda, comissoes e resultados.",
    features: [
      "Tudo do plano Base",
      "Ate 6 profissionais",
      "6 logins de funcionarios",
      "Comissoes por profissional",
      "Notificacoes push da agenda",
      "Relatorios de faturamento",
      "Prioridade no suporte",
    ],
  },
  super: {
    key: "super",
    name: "Super",
    badge: "Completo",
    price: "R$129,90",
    summary: "Para operacoes que querem acompanhamento mais proximo e prioridade.",
    features: [
      "Tudo do plano Medio",
      "Ate 20 profissionais",
      "20 logins de funcionarios",
      "Onboarding assistido",
      "Revisao de operacao e agenda",
      "Prioridade maxima no suporte",
      "Insights avancados de operacao",
    ],
  },
} as const;

export type PaidPlanKey = keyof typeof PAID_PLAN_DATA;
export type ActivePaidPlanKey = PaidPlanKey | typeof LEGACY_PREMIUM_PLAN;
export type SubscriptionPlanKey = "trial" | ActivePaidPlanKey | typeof PAYMENT_PENDING_PLAN | "expired";
export type PaidPlan = (typeof PAID_PLAN_DATA)[PaidPlanKey];
export interface PlanLimits {
  professionals: number;
  employeeLogins: number;
}

const PLAN_LIMITS: Record<PaidPlanKey | "trial" | typeof LEGACY_PREMIUM_PLAN | typeof PAYMENT_PENDING_PLAN | "expired", PlanLimits> = {
  trial: { professionals: 20, employeeLogins: 20 },
  base: { professionals: 2, employeeLogins: 1 },
  medio: { professionals: 6, employeeLogins: 6 },
  super: { professionals: 20, employeeLogins: 20 },
  premium: { professionals: 2, employeeLogins: 1 },
  pending: { professionals: 0, employeeLogins: 0 },
  expired: { professionals: 0, employeeLogins: 0 },
};

export const PAID_PLANS = Object.values(PAID_PLAN_DATA);
export const PAID_PLAN_BY_KEY: Record<PaidPlanKey, PaidPlan> = PAID_PLAN_DATA;

export function isPaidPlanKey(plan: unknown): plan is PaidPlanKey {
  return typeof plan === "string" && Object.prototype.hasOwnProperty.call(PAID_PLAN_BY_KEY, plan);
}

export function isPaidPlan(plan: unknown): plan is ActivePaidPlanKey {
  return plan === LEGACY_PREMIUM_PLAN || isPaidPlanKey(plan);
}

export function getPlanDisplayName(plan: unknown): string {
  if (plan === LEGACY_PREMIUM_PLAN) return "Premium";
  if (plan === PAYMENT_PENDING_PLAN) return "Pagamento pendente";
  if (plan === "expired") return "Expirado";
  if (plan === "trial") return "Trial gratuito";
  return isPaidPlanKey(plan) ? PAID_PLAN_BY_KEY[plan].name : PAID_PLAN_BY_KEY.base.name;
}

export function getPlanPrice(plan: unknown): string {
  if (plan === LEGACY_PREMIUM_PLAN) return "R$59,00";
  return isPaidPlanKey(plan) ? PAID_PLAN_BY_KEY[plan].price : PAID_PLAN_BY_KEY.base.price;
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
  return isPaidPlanKey(plan) ? PLAN_LIMITS[plan] : PLAN_LIMITS.base;
}

export function planHasFeature(plan: unknown, feature: "team" | "commissions" | "notifications" | "reports" | "advancedReports"): boolean {
  const rank = paidPlanRank(plan);
  if (feature === "advancedReports") return rank >= 3;
  if (feature === "team") return rank >= 1;
  if (feature === "commissions" || feature === "notifications" || feature === "reports") return rank >= 2;
  return rank >= 1;
}
