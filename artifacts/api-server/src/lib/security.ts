import type { NextFunction, Request, Response } from "express";

interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyPrefix: string;
  message: string;
}

const buckets = new Map<string, { count: number; resetAt: number }>();

function clientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) return forwarded.split(",")[0].trim();
  return req.ip || req.socket.remoteAddress || "unknown";
}

export function rateLimit(options: RateLimitOptions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const key = `${options.keyPrefix}:${clientIp(req)}`;
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      next();
      return;
    }

    if (bucket.count >= options.max) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({ error: options.message, code: "rate_limited", retryAfter });
      return;
    }

    bucket.count += 1;
    next();
  };
}

export function passwordPolicyError(password: string): string | null {
  if (password.length < 8) return "A senha deve ter pelo menos 8 caracteres.";
  if (!/[A-Za-zÀ-ÿ]/.test(password)) return "A senha deve ter pelo menos uma letra.";
  if (!/\d/.test(password)) return "A senha deve ter pelo menos um numero.";
  return null;
}
