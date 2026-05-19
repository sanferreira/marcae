import crypto from "node:crypto";
import { eq, and, gt } from "drizzle-orm";
import { db, sessionsTable, usersTable, barbershopsTable } from "@workspace/db";

const SESSION_DAYS = 30;
export const SESSION_COOKIE = "bp_session";

export function newSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function isCookieAuthEnabled(): boolean {
  return process.env.AUTH_COOKIE_ENABLED === "true";
}

function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

export async function createSession(userId: string): Promise<string> {
  const token = newSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
  await db.insert(sessionsTable).values({ token: tokenHash, userId, expiresAt });
  return token;
}

export async function destroySession(token: string): Promise<void> {
  await db.delete(sessionsTable).where(eq(sessionsTable.token, hashSessionToken(token)));
}

export async function lookupSession(token: string) {
  const tokenHash = hashSessionToken(token);
  const rows = await db
    .select({
      session: sessionsTable,
      user: usersTable,
      barbershop: barbershopsTable,
    })
    .from(sessionsTable)
    .innerJoin(usersTable, eq(usersTable.id, sessionsTable.userId))
    .innerJoin(barbershopsTable, eq(barbershopsTable.id, usersTable.barbershopId))
    .where(and(eq(sessionsTable.token, tokenHash), gt(sessionsTable.expiresAt, new Date())))
    .limit(1);
  return rows[0] ?? null;
}
