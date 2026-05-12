import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { attachAuth } from "./lib/auth";
import { buildWebhookRouter, setWebhookSecret } from "./routes/webhook";
import { getStripeSync } from "./lib/stripeClient";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) { return { statusCode: res.statusCode }; },
    },
  }),
);

app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());

// Stripe webhook MUST be registered before express.json so the body stays a Buffer.
app.use(buildWebhookRouter());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", attachAuth, router);

// Initialize Stripe schema + managed webhook in the background. Failures are logged
// but never block the server from starting (e.g. when the connector is mid-setup).
void (async () => {
  try {
    const { runMigrations } = await import("stripe-replit-sync");
    await runMigrations({ databaseUrl: process.env.DATABASE_URL! });
    const sync = await getStripeSync();
    const domain = (process.env.REPLIT_DOMAINS ?? "").split(",")[0];
    if (domain) {
      const { webhook } = await sync.findOrCreateManagedWebhook(`https://${domain}/api/stripe/webhook`);
      if (webhook?.secret) setWebhookSecret(webhook.secret);
      logger.info({ domain }, "stripe managed webhook ready");
    } else {
      logger.warn("REPLIT_DOMAINS unset — skipping managed webhook setup");
    }
    void sync.syncBackfill().catch((err: unknown) => logger.warn({ err }, "stripe syncBackfill failed"));
  } catch (err) {
    logger.warn({ err }, "stripe initialization skipped");
  }
})();

export default app;
