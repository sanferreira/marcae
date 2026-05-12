// Stripe webhook handler. Registered in app.ts BEFORE express.json() so the
// body stays a Buffer (required for signature verification).
import express, { type Request, type Response, type Router } from "express";
import { eq } from "drizzle-orm";
import { db, barbershopsTable } from "@workspace/db";
import { getStripeSync, getUncachableStripeClient } from "../lib/stripeClient";
import { logger } from "../lib/logger";

let webhookSecret: string | null = null;
export function setWebhookSecret(s: string): void { webhookSecret = s; }

export function buildWebhookRouter(): Router {
  const r = express.Router();
  r.post("/api/stripe/webhook", express.raw({ type: "application/json" }), handleWebhook);
  return r;
}

async function handleWebhook(req: Request, res: Response): Promise<void> {
  const signature = req.headers["stripe-signature"];
  if (!signature) { res.status(400).json({ error: "Missing signature" }); return; }
  const sig = Array.isArray(signature) ? signature[0] : signature;

  // We MUST verify the signature before reading the payload as a trusted event.
  // Without a webhook secret we cannot mutate billing state from this request —
  // the body is attacker-controlled. We still let stripe-replit-sync process it
  // (it does its own verification using the secret it provisioned), but we will
  // not run our own reconciliation on the unverified payload.
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

  // Sync into the local stripe schema (products, customers, subscriptions, etc.).
  // stripe-replit-sync verifies the signature against the secret it manages.
  let syncOk = false;
  try {
    const sync = await getStripeSync();
    await sync.processWebhook(req.body as Buffer, sig);
    syncOk = true;
  } catch (err) {
    logger.warn({ err }, "stripe-replit-sync processWebhook failed");
  }

  // Only reconcile barbershops state from a trusted source:
  // either our own constructEvent succeeded, or sync (which also verifies) accepted it.
  if (verifiedEvent || syncOk) {
    try {
      // If we don't have our own verified event but sync verified, re-parse the body.
      // It's safe now because we know the signature was accepted upstream.
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
  if (!e?.type?.startsWith("customer.subscription.")) return;
  const sub = e.data.object as {
    id: string;
    customer: string;
    status: string;
    current_period_end?: number;
    cancel_at_period_end?: boolean;
  };
  if (!sub?.customer) return;

  const [shop] = await db.select().from(barbershopsTable)
    .where(eq(barbershopsTable.stripeCustomerId, sub.customer))
    .limit(1);
  if (!shop) {
    logger.info({ customer: sub.customer }, "subscription event for unknown customer");
    return;
  }

  const isActive = sub.status === "active" || sub.status === "trialing";
  const renewsAt = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null;

  await db.update(barbershopsTable).set({
    plan: isActive ? "premium" : "expired",
    stripeSubscriptionId: sub.id,
    subscriptionRenewsAt: renewsAt,
  }).where(eq(barbershopsTable.id, shop.id));

  logger.info({ shopId: shop.id, status: sub.status, renewsAt }, "barbershop plan reconciled from stripe webhook");
}

