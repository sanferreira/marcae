import express, { type Request, type Response, type Router } from "express";
import { eq } from "drizzle-orm";
import { db, barbershopsTable } from "@workspace/db";
import {
  getStripeSync,
  getUncachableStripeClient,
  isStripeConfigured,
} from "../lib/stripeClient";
import { logger } from "../lib/logger";
import {
  PAYMENT_PENDING_PLAN,
  paidPlanFromStripeSubscription,
  subscriptionStateFromStripeSubscription,
} from "../lib/plans";

let webhookSecret: string | null = null;
export function setWebhookSecret(s: string): void { webhookSecret = s; }

export function buildWebhookRouter(): Router {
  const r = express.Router();
  r.post("/api/stripe/webhook", express.raw({ type: "application/json" }), handleWebhook);
  return r;
}

async function handleWebhook(req: Request, res: Response): Promise<void> {
  if (!isStripeConfigured()) {
    res.status(503).json({ error: "Stripe not configured" });
    return;
  }

  const signature = req.headers["stripe-signature"];
  if (!signature) { res.status(400).json({ error: "Missing signature" }); return; }
  const sig = Array.isArray(signature) ? signature[0] : signature;

  let verifiedEvent: unknown = null;
  if (webhookSecret) {
    try {
      const stripe = await getUncachableStripeClient();
      verifiedEvent = stripe.webhooks.constructEvent(req.body as Buffer, sig, webhookSecret);
    } catch (err) {
      logger.warn({ err }, "stripe webhook signature verification failed");
      res.status(400).json({ error: "Invalid signature" });
      return;
    }
  }

  let syncOk = false;
  try {
    const sync = await getStripeSync();
    await sync.processWebhook(req.body as Buffer, sig);
    syncOk = true;
  } catch (err) {
    logger.warn({ err }, "stripe-replit-sync processWebhook failed");
  }

  if (verifiedEvent || syncOk) {
    try {
      const event = verifiedEvent ?? JSON.parse((req.body as Buffer).toString("utf8"));
      await reconcileSubscriptionEvent(event);
    } catch (err) {
      logger.warn({ err }, "failed to reconcile subscription event onto barbershop");
    }
  } else {
    logger.warn("dropping webhook reconcile: signature could not be verified by either path");
  }

  res.status(200).json({ received: true });
}

interface StripeEvent {
  type: string;
  data: { object: Record<string, unknown> };
}

async function reconcileSubscriptionEvent(rawEvent: unknown): Promise<void> {
  const e = rawEvent as StripeEvent;
  if (!e?.type) return;

  if (e.type.startsWith("customer.subscription.")) {
    await reconcileSubscriptionObject(e.data.object);
    return;
  }

  if (e.type === "invoice.paid") {
    await reconcilePaidInvoice(e.data.object);
    return;
  }

  if (e.type === "invoice.payment_failed") {
    await reconcileFailedInvoice(e.data.object);
    return;
  }

  if (e.type === "checkout.session.completed") {
    await reconcileCheckoutCompleted(e.data.object);
  }
}

function stripeId(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && typeof (value as { id?: unknown }).id === "string") {
    return (value as { id: string }).id;
  }
  return null;
}

function customerIdFromObject(raw: unknown): string | null {
  const obj = raw as { customer?: unknown } | null | undefined;
  return stripeId(obj?.customer);
}

function subscriptionIdFromObject(raw: unknown): string | null {
  const obj = raw as {
    subscription?: unknown;
    parent?: { subscription_details?: { subscription?: unknown } | null } | null;
  } | null | undefined;

  return stripeId(obj?.subscription) ?? stripeId(obj?.parent?.subscription_details?.subscription);
}

function periodEndFromSubscription(raw: unknown): Date | null {
  const periodEnd = (raw as { current_period_end?: unknown } | null | undefined)?.current_period_end;
  return typeof periodEnd === "number" ? new Date(periodEnd * 1000) : null;
}

function periodEndFromInvoice(raw: unknown): Date | null {
  const invoice = raw as {
    lines?: { data?: Array<{ period?: { end?: unknown } | null }> } | null;
  } | null | undefined;
  const periodEnd = invoice?.lines?.data?.[0]?.period?.end;
  return typeof periodEnd === "number" ? new Date(periodEnd * 1000) : null;
}

async function getSubscription(subscriptionId: string): Promise<unknown | null> {
  try {
    const stripe = await getUncachableStripeClient();
    return await stripe.subscriptions.retrieve(subscriptionId, { expand: ["items.data.price"] });
  } catch (err) {
    logger.warn({ err, subscriptionId }, "failed to fetch stripe subscription");
    return null;
  }
}

async function findShopByCustomer(customerId: string) {
  const [shop] = await db.select().from(barbershopsTable)
    .where(eq(barbershopsTable.stripeCustomerId, customerId))
    .limit(1);
  if (!shop) {
    logger.info({ customer: customerId }, "billing event for unknown customer");
    return null;
  }
  return shop;
}

async function applyBillingState(raw: {
  customerId: string;
  plan: string;
  stripeSubscriptionId?: string | null;
  renewsAt?: Date | null;
  reason: string;
}): Promise<void> {
  const shop = await findShopByCustomer(raw.customerId);
  if (!shop) return;

  await db.update(barbershopsTable).set({
    plan: raw.plan,
    stripeSubscriptionId: raw.stripeSubscriptionId ?? shop.stripeSubscriptionId,
    subscriptionRenewsAt: raw.renewsAt ?? null,
  }).where(eq(barbershopsTable.id, shop.id));

  logger.info({
    shopId: shop.id,
    plan: raw.plan,
    renewsAt: raw.renewsAt ?? null,
    reason: raw.reason,
  }, "barbershop plan reconciled from stripe webhook");
}

async function reconcileSubscriptionObject(rawSubscription: unknown): Promise<void> {
  const customerId = customerIdFromObject(rawSubscription);
  if (!customerId) return;

  await applyBillingState({
    customerId,
    plan: subscriptionStateFromStripeSubscription(rawSubscription),
    stripeSubscriptionId: stripeId((rawSubscription as { id?: unknown } | null | undefined)?.id),
    renewsAt: periodEndFromSubscription(rawSubscription),
    reason: "subscription",
  });
}

async function reconcilePaidInvoice(rawInvoice: unknown): Promise<void> {
  const customerId = customerIdFromObject(rawInvoice);
  if (!customerId) return;

  const subscriptionId = subscriptionIdFromObject(rawInvoice);
  if (!subscriptionId) {
    logger.info({ customer: customerId }, "paid invoice without subscription ignored");
    return;
  }
  const subscription = subscriptionId ? await getSubscription(subscriptionId) : null;

  await applyBillingState({
    customerId,
    plan: subscription ? paidPlanFromStripeSubscription(subscription) : paidPlanFromStripeSubscription(rawInvoice),
    stripeSubscriptionId: subscriptionId,
    renewsAt: periodEndFromSubscription(subscription) ?? periodEndFromInvoice(rawInvoice),
    reason: "invoice.paid",
  });
}

async function reconcileFailedInvoice(rawInvoice: unknown): Promise<void> {
  const customerId = customerIdFromObject(rawInvoice);
  if (!customerId) return;
  const subscriptionId = subscriptionIdFromObject(rawInvoice);
  if (!subscriptionId) {
    logger.info({ customer: customerId }, "failed invoice without subscription ignored");
    return;
  }

  await applyBillingState({
    customerId,
    plan: PAYMENT_PENDING_PLAN,
    stripeSubscriptionId: subscriptionId,
    renewsAt: periodEndFromInvoice(rawInvoice),
    reason: "invoice.payment_failed",
  });
}

async function reconcileCheckoutCompleted(rawSession: unknown): Promise<void> {
  const session = rawSession as { payment_status?: unknown } | null | undefined;
  if (session?.payment_status !== "paid" && session?.payment_status !== "no_payment_required") return;

  const customerId = customerIdFromObject(rawSession);
  const subscriptionId = subscriptionIdFromObject(rawSession);
  if (!customerId || !subscriptionId) return;

  const subscription = await getSubscription(subscriptionId);
  await applyBillingState({
    customerId,
    plan: subscription ? paidPlanFromStripeSubscription(subscription) : paidPlanFromStripeSubscription(rawSession),
    stripeSubscriptionId: subscriptionId,
    renewsAt: periodEndFromSubscription(subscription),
    reason: "checkout.session.completed",
  });
}
