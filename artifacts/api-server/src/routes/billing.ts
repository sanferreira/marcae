import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, barbershopsTable } from "@workspace/db";
import { requireAuth, requireRole } from "../lib/auth";
import { getUncachableStripeClient, isStripeConfigured } from "../lib/stripeClient";
import { logger } from "../lib/logger";
import {
  PAID_PLANS,
  type PaidPlanKey,
  normalizePaidPlan,
  subscriptionStateFromStripeSubscription,
} from "../lib/plans";

const router: IRouter = Router();
router.use(requireAuth);

const cachedPriceIds: Partial<Record<PaidPlanKey, string>> = {};

function billingDisabled(res: Response): boolean {
  if (isStripeConfigured()) return false;

  res.status(503).json({
    error: "Stripe nao configurado. Defina STRIPE_SECRET_KEY para habilitar a cobranca.",
  });
  return true;
}

async function ensurePrice(planKey: PaidPlanKey): Promise<string> {
  if (cachedPriceIds[planKey]) return cachedPriceIds[planKey];
  const plan = PAID_PLANS[planKey];
  const stripe = await getUncachableStripeClient();
  const products = await stripe.products.search({ query: `name:'${plan.productName}' AND active:'true'` });
  let product = products.data[0];
  if (!product) {
    product = await stripe.products.create({
      name: plan.productName,
      description: plan.description,
      metadata: { plan: plan.key },
    });
  }
  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 10 });
  let price = prices.data.find(
    (p) => p.unit_amount === plan.priceCents && p.currency === "brl" && p.recurring?.interval === "month",
  );
  if (!price) {
    price = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.priceCents,
      currency: "brl",
      recurring: { interval: "month" },
      metadata: { plan: plan.key },
    });
  }
  cachedPriceIds[planKey] = price.id;
  return price.id;
}

async function ensureCustomer(shopId: string): Promise<string> {
  const [shop] = await db.select().from(barbershopsTable).where(eq(barbershopsTable.id, shopId)).limit(1);
  if (!shop) throw new Error("Shop not found");
  if (shop.stripeCustomerId) return shop.stripeCustomerId;
  const stripe = await getUncachableStripeClient();
  const customer = await stripe.customers.create({
    email: shop.ownerEmail,
    name: shop.name,
    metadata: { barbershopId: shop.id, slug: shop.slug },
  });
  await db.update(barbershopsTable).set({ stripeCustomerId: customer.id }).where(eq(barbershopsTable.id, shop.id));
  return customer.id;
}

function returnUrls(req: Request): { success: string; cancel: string } {
  const configuredOrigin = process.env.APP_BASE_URL?.trim() || process.env.PUBLIC_APP_URL?.trim();
  const origin = (req.headers.origin as string | undefined)
    ?? (() => {
      try {
        return req.headers.referer ? new URL(req.headers.referer as string).origin : null;
      } catch {
        return null;
      }
    })()
    ?? configuredOrigin
    ?? "http://localhost:3000";

  return {
    success: `${origin}/?billing=success`,
    cancel: `${origin}/?billing=cancel`,
  };
}

router.post("/billing/checkout", requireRole("admin"), async (req: Request, res: Response): Promise<void> => {
  if (billingDisabled(res)) return;

  try {
    const planKey = normalizePaidPlan((req.body as { plan?: unknown } | undefined)?.plan);
    const stripe = await getUncachableStripeClient();
    const customerId = await ensureCustomer(req.auth!.barbershop.id);
    const priceId = await ensurePrice(planKey);
    const { success, cancel } = returnUrls(req);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: success,
      cancel_url: cancel,
      allow_promotion_codes: true,
      metadata: { barbershopId: req.auth!.barbershop.id, plan: planKey },
      subscription_data: { metadata: { barbershopId: req.auth!.barbershop.id, plan: planKey } },
    });
    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    logger.error({ err }, "failed to create checkout session");
    res.status(500).json({ error: "Nao foi possivel iniciar o pagamento." });
  }
});

router.post("/billing/portal", requireRole("admin"), async (req: Request, res: Response): Promise<void> => {
  if (billingDisabled(res)) return;

  try {
    const stripe = await getUncachableStripeClient();
    const customerId = await ensureCustomer(req.auth!.barbershop.id);
    const { success } = returnUrls(req);
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: success,
    });
    res.json({ url: portal.url });
  } catch (err) {
    logger.error({ err }, "failed to create billing portal session");
    res.status(500).json({ error: "Nao foi possivel abrir o portal de assinatura." });
  }
});

router.post("/billing/sync", requireRole("admin"), async (req: Request, res: Response): Promise<void> => {
  if (billingDisabled(res)) return;

  try {
    const stripe = await getUncachableStripeClient();
    const shopId = req.auth!.barbershop.id;
    const [shop] = await db.select().from(barbershopsTable).where(eq(barbershopsTable.id, shopId)).limit(1);
    if (!shop?.stripeCustomerId) {
      res.json({ ok: true, plan: shop?.plan ?? "trial" });
      return;
    }
    const subs = await stripe.subscriptions.list({ customer: shop.stripeCustomerId, status: "all", limit: 5 });
    const live = subs.data.find((s) => s.status === "active" || s.status === "trialing")
      ?? subs.data.sort((a, b) => (b.created ?? 0) - (a.created ?? 0))[0];
    if (!live) {
      res.json({ ok: true, plan: shop.plan });
      return;
    }
    const nextPlan = subscriptionStateFromStripeSubscription(live);
    const periodEnd = (live as unknown as { current_period_end?: number }).current_period_end;
    const renewsAt = periodEnd ? new Date(periodEnd * 1000) : null;
    await db.update(barbershopsTable).set({
      plan: nextPlan,
      stripeSubscriptionId: live.id,
      subscriptionRenewsAt: renewsAt,
    }).where(eq(barbershopsTable.id, shopId));
    res.json({ ok: true, plan: nextPlan, renewsAt });
  } catch (err) {
    logger.error({ err }, "failed to sync billing");
    res.status(500).json({ error: "Falha ao sincronizar assinatura." });
  }
});

export default router;
