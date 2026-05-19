// Replit Stripe integration — credentials sourced from the Replit connector at runtime.
// Do NOT cache the Stripe client; tokens may rotate.
import Stripe from "stripe";

interface ConnectionSettings {
  settings: { publishable?: string; secret?: string };
}

const STRIPE_API_VERSION = "2025-11-17.clover";

function getEnvCredentials():
  | { publishableKey: string; secretKey: string }
  | null {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();

  if (!secretKey) return null;

  return {
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY?.trim() ?? "",
    secretKey,
  };
}

export function isStripeConfigured(): boolean {
  if (getEnvCredentials()) return true;

  return Boolean(
    process.env.REPLIT_CONNECTORS_HOSTNAME &&
      (process.env.REPL_IDENTITY || process.env.WEB_REPL_RENEWAL),
  );
}

export function getStripeWebhookSecret(): string | null {
  return process.env.STRIPE_WEBHOOK_SECRET?.trim() || null;
}

async function getCredentials(): Promise<{ publishableKey: string; secretKey: string }> {
  const envCredentials = getEnvCredentials();
  if (envCredentials) return envCredentials;

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (!hostname || !xReplitToken) {
    throw new Error(
      "Stripe is not configured. Set STRIPE_SECRET_KEY locally or configure the Replit connector.",
    );
  }

  const isProduction = process.env.REPLIT_DEPLOYMENT === "1";
  const targetEnvironment = isProduction ? "production" : "development";

  const url = new URL(`https://${hostname}/api/v2/connection`);
  url.searchParams.set("include_secrets", "true");
  url.searchParams.set("connector_names", "stripe");
  url.searchParams.set("environment", targetEnvironment);

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json", "X-Replit-Token": xReplitToken },
  });
  const data = (await response.json()) as { items?: ConnectionSettings[] };
  const c = data.items?.[0];

  if (!c || !c.settings.publishable || !c.settings.secret) {
    throw new Error(`Stripe ${targetEnvironment} connection not found`);
  }

  return { publishableKey: c.settings.publishable, secretKey: c.settings.secret };
}

export async function getUncachableStripeClient(): Promise<Stripe> {
  const { secretKey } = await getCredentials();
  // Pin to the Stripe API version supported by the installed SDK types.
  return new Stripe(secretKey, { apiVersion: STRIPE_API_VERSION });
}

export async function getStripeSecretKey(): Promise<string> {
  return (await getCredentials()).secretKey;
}

// We keep the Stripe sync client loosely typed because stripe-replit-sync's
// public surface drifts across versions; we only call a few well-known methods.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let stripeSync: any = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getStripeSync(): Promise<any> {
  if (!stripeSync) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = (await import("stripe-replit-sync")) as any;
    const secretKey = await getStripeSecretKey();
    stripeSync = new mod.StripeSync({
      poolConfig: { connectionString: process.env.DATABASE_URL!, max: 2 },
      stripeSecretKey: secretKey,
    });
  }

  return stripeSync;
}
