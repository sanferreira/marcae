import type { Request, Response, NextFunction } from "express";
import { computePlanStatus } from "./serializers";
import { type PlanFeature, planHasFeature } from "./plans";

/**
 * Blocks any mutation when the current shop has no active plan
 * (trial expired and no paid subscription). Read endpoints stay open
 * so users can still review their data; writes are rejected with 402.
 */
export function requirePremium(req: Request, res: Response, next: NextFunction): void {
  if (!req.auth) {
    res.status(401).json({ error: "Não autenticado." });
    return;
  }
  const status = computePlanStatus(req.auth.barbershop);
  if (!status.isActive) {
    res.status(402).json({
      error: "Este estabelecimento está com a assinatura vencida. O administrador precisa renovar para continuar.",
      code: "subscription_required",
      planStatus: status,
    });
    return;
  }
  next();
}

/** Convenience: only block mutating HTTP verbs on a router. */
export function requirePremiumForMutations(req: Request, res: Response, next: NextFunction): void {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    next();
    return;
  }
  requirePremium(req, res, next);
}

export function requirePlanFeature(feature: PlanFeature) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ error: "Nao autenticado." });
      return;
    }
    if (!planHasFeature(req.auth.barbershop.plan, feature)) {
      res.status(402).json({
        error: "Este recurso esta disponivel a partir do plano Medio.",
        code: "plan_upgrade_required",
        feature,
        planStatus: computePlanStatus(req.auth.barbershop),
      });
      return;
    }
    next();
  };
}
