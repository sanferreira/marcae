import crypto from "node:crypto";
import { eq, and, gt } from "drizzle-orm";
import { db, sessionsTable, usersTable, barbershopsTable } from "@workspace/db";

const SESSION_DAYS = 30;
export const SESSION_COOKIE = "bp_session";

export function newSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function createSession(userId: string): Promise<string> {
  const token = newSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
  await db.insert(sessionsTable).values({ token, userId, expiresAt });
  return token;
}

export async function destroySession(token: string): Promise<void> {
  await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
}

export async function lookupSession(token: string) {
  const rows = await db
    .select({
      session: sessionsTable,
      user: usersTable,
      barbershop: barbershopsTable,
    })
    .from(sessionsTable)
    .innerJoin(usersTable, eq(usersTable.id, sessionsTable.userId))
    .innerJoin(barbershopsTable, eq(barbershopsTable.id, usersTable.barbershopId))
    .where(and(eq(sessionsTable.token, token), gt(sessionsTable.expiresAt, new Date())))
    .limit(1);
  return rows[0] ?? null;
}
