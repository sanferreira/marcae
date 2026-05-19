import type { Request, Response, NextFunction } from "express";
import { isCookieAuthEnabled, lookupSession, SESSION_COOKIE } from "./sessions";
import type { Barbershop, User } from "@workspace/db";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: { user: User; barbershop: Barbershop; token: string };
    }
  }
}

function tokenFromReq(req: Request): string | null {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) return header.slice(7);
  if (!isCookieAuthEnabled()) return null;
  const cookieToken = (req as Request & { cookies?: Record<string, string> }).cookies?.[SESSION_COOKIE];
  return cookieToken ?? null;
}

export async function attachAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = tokenFromReq(req);
  if (token) {
    const found = await lookupSession(token);
    if (found) req.auth = { user: found.user, barbershop: found.barbershop, token };
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.auth) {
    res.status(401).json({ error: "Não autenticado." });
    return;
  }
  next();
}

export function requireRole(...roles: Array<"admin" | "employee" | "client">) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ error: "Não autenticado." });
      return;
    }
    if (!roles.includes(req.auth.user.role as "admin" | "employee" | "client")) {
      res.status(403).json({ error: "Acesso negado." });
      return;
    }
    next();
  };
}
