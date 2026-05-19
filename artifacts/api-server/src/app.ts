import express, { type Express, type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { attachAuth } from "./lib/auth";
import { isCookieAuthEnabled } from "./lib/sessions";
import { buildWebhookRouter, setWebhookSecret } from "./routes/webhook";
import {
  getStripeSync,
  getStripeWebhookSecret,
  isStripeConfigured,
} from "./lib/stripeClient";

const app: Express = express();
const configuredWebhookSecret = getStripeWebhookSecret();
const BODY_LIMIT = "2mb";
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const configuredOrigins = [
  process.env.APP_BASE_URL,
  process.env.CORS_ORIGINS,
  process.env.REPLIT_DOMAINS
    ?.split(",")
    .filter(Boolean)
    .map((domain) => `https://${domain.trim()}`)
    .join(","),
]
  .filter(Boolean)
  .flatMap((value) => value!.split(","))
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

function isAllowedOrigin(origin: string): boolean {
  const normalized = origin.replace(/\/+$/, "");
  if (configuredOrigins.includes(normalized)) return true;
  if (process.env.NODE_ENV !== "production") {
    return /^https?:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d+)?$/.test(normalized);
  }
  return false;
}

if (configuredWebhookSecret) {
  setWebhookSecret(configuredWebhookSecret);
}

app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use((_req: Request, res: Response, next: NextFunction): void => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
  }
  next();
});

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

app.use(cors({
  credentials: true,
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }
    callback(null, isAllowedOrigin(origin));
  },
}));

app.use((req: Request, res: Response, next: NextFunction): void => {
  const origin = req.headers.origin;
  if (origin && MUTATING_METHODS.has(req.method) && !isAllowedOrigin(origin)) {
    res.status(403).json({ error: "Origem nao autorizada." });
    return;
  }
  next();
});

if (isCookieAuthEnabled()) app.use(cookieParser());

// Stripe webhook MUST be registered before express.json so the body stays a Buffer.
app.use(buildWebhookRouter());

app.use(express.json({ limit: BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: BODY_LIMIT }));

app.use("/api", attachAuth, router);

app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  const bodyErr = err as { type?: string; status?: number; message?: string };

  if (bodyErr?.type === "entity.too.large" || bodyErr?.status === 413) {
    logger.warn({ err: bodyErr, url: req.url }, "request body too large");
    res.status(413).json({ error: "Imagem muito grande. Escolha uma foto menor." });
    return;
  }

  if (bodyErr?.type === "entity.parse.failed") {
    logger.warn({ err: bodyErr, url: req.url }, "invalid json payload");
    res.status(400).json({ error: "Payload invalido." });
    return;
  }

  if (err) {
    logger.error({ err, url: req.url }, "unhandled request error");
    res.status(500).json({ error: "Erro interno do servidor." });
    return;
  }

  next();
});

// Initialize Stripe schema + managed webhook in the background. Failures are logged
// but never block the server from starting (e.g. when the connector is mid-setup).
void (async () => {
  if (!isStripeConfigured()) {
    logger.warn("Stripe not configured - billing startup skipped");
    return;
  }

  try {
    const { runMigrations } = await import("stripe-replit-sync");
    await runMigrations({ databaseUrl: process.env.DATABASE_URL! });
    const sync = await getStripeSync();
    const domain = (process.env.REPLIT_DOMAINS ?? "").split(",")[0];

    if (domain) {
      const { webhook } = await sync.findOrCreateManagedWebhook(`https://${domain}/api/stripe/webhook`);
      if (webhook?.secret) setWebhookSecret(webhook.secret);
      logger.info({ domain }, "stripe managed webhook ready");
    } else if (configuredWebhookSecret) {
      logger.info("using STRIPE_WEBHOOK_SECRET from environment");
    } else {
      logger.warn("no Stripe webhook configured - managed webhook setup skipped");
    }

    void sync.syncBackfill().catch((err: unknown) =>
      logger.warn({ err }, "stripe syncBackfill failed"),
    );
  } catch (err) {
    logger.warn({ err }, "stripe initialization skipped");
  }
})();

export default app;
