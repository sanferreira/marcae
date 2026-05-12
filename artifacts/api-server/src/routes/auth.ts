import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq } from "drizzle-orm";
import { db, barbershopsTable, usersTable, clientsTable, loyaltySettingsTable } from "@workspace/db";
import {
  RegisterShopBody,
  RegisterClientBody,
  LoginBody,
  LoginResponse,
  GetMeResponse,
} from "@workspace/api-zod";
import { hashPassword, verifyPassword } from "../lib/password";
import { createSession, destroySession, SESSION_COOKIE } from "../lib/sessions";
import { computePlanStatus, serializeBarbershop, serializeUser, slugify } from "../lib/serializers";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

const COOKIE_OPTS = {
  httpOnly: true,
  secure: true,
  sameSite: "none" as const,
  path: "/",
  maxAge: 30 * 86400 * 1000,
};

function buildSession(token: string, user: Parameters<typeof serializeUser>[0], shop: Parameters<typeof serializeBarbershop>[0]) {
  return {
    token,
    user: serializeUser(user),
    barbershop: serializeBarbershop(shop),
    planStatus: computePlanStatus(shop),
  };
}

router.post("/auth/register-shop", async (req: Request, res: Response): Promise<void> => {
  const parsed = RegisterShopBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" });
    return;
  }
  const slug = slugify(parsed.data.slug);
  if (!slug) {
    res.status(400).json({ error: "ID da barbearia inválido." });
    return;
  }
  const existing = await db.select().from(barbershopsTable).where(eq(barbershopsTable.slug, slug)).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "Esse ID de barbearia já está em uso." });
    return;
  }
  const ownerEmail = parsed.data.ownerEmail.trim().toLowerCase();
  const trialEndsAt = new Date(Date.now() + 7 * 86400000);
  const [shop] = await db.insert(barbershopsTable).values({
    slug,
    name: parsed.data.name.trim(),
    ownerName: parsed.data.ownerName.trim(),
    ownerEmail,
    phone: parsed.data.phone ?? null,
    plan: "trial",
    trialEndsAt,
  }).returning();
  const passwordHash = await hashPassword(parsed.data.password);
  const [admin] = await db.insert(usersTable).values({
    barbershopId: shop.id,
    role: "admin",
    name: parsed.data.ownerName.trim(),
    email: ownerEmail,
    phone: parsed.data.phone ?? null,
    passwordHash,
  }).returning();
  await db.insert(loyaltySettingsTable).values({ barbershopId: shop.id }).onConflictDoNothing();
  const token = await createSession(admin.id);
  res.cookie(SESSION_COOKIE, token, COOKIE_OPTS);
  res.status(201).json(LoginResponse.parse(buildSession(token, admin, shop)));
});

router.post("/auth/register-client", async (req: Request, res: Response): Promise<void> => {
  const parsed = RegisterClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" });
    return;
  }
  const slug = slugify(parsed.data.slug);
  const [shop] = await db.select().from(barbershopsTable).where(eq(barbershopsTable.slug, slug)).limit(1);
  if (!shop) {
    res.status(404).json({ error: "Barbearia não encontrada." });
    return;
  }
  const email = parsed.data.email.trim().toLowerCase();
  const dup = await db.select().from(usersTable)
    .where(and(eq(usersTable.barbershopId, shop.id), eq(usersTable.email, email)))
    .limit(1);
  if (dup.length > 0) {
    res.status(409).json({ error: "Já existe usuário com esse email nessa barbearia." });
    return;
  }
  const passwordHash = await hashPassword(parsed.data.password);
  const [client] = await db.insert(clientsTable).values({
    barbershopId: shop.id,
    name: parsed.data.name.trim(),
    phone: parsed.data.phone,
    email,
  }).returning();
  const [user] = await db.insert(usersTable).values({
    barbershopId: shop.id,
    role: "client",
    name: parsed.data.name.trim(),
    email,
    phone: parsed.data.phone,
    passwordHash,
    clientId: client.id,
  }).returning();
  await db.update(clientsTable).set({ userId: user.id }).where(eq(clientsTable.id, client.id));
  const token = await createSession(user.id);
  res.cookie(SESSION_COOKIE, token, COOKIE_OPTS);
  res.status(201).json(LoginResponse.parse(buildSession(token, user, shop)));
});

router.post("/auth/login", async (req: Request, res: Response): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(401).json({ error: "Credenciais inválidas." });
    return;
  }
  const slug = slugify(parsed.data.slug);
  const email = parsed.data.email.trim().toLowerCase();
  const [shop] = await db.select().from(barbershopsTable).where(eq(barbershopsTable.slug, slug)).limit(1);
  if (!shop) {
    res.status(401).json({ error: "Barbearia não encontrada com esse ID." });
    return;
  }
  const [user] = await db.select().from(usersTable)
    .where(and(eq(usersTable.barbershopId, shop.id), eq(usersTable.email, email)))
    .limit(1);
  if (!user) {
    res.status(401).json({ error: "Usuário ou senha inválidos." });
    return;
  }
  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "Usuário ou senha inválidos." });
    return;
  }
  const token = await createSession(user.id);
  res.cookie(SESSION_COOKIE, token, COOKIE_OPTS);
  res.json(LoginResponse.parse(buildSession(token, user, shop)));
});

router.post("/auth/logout", async (req: Request, res: Response): Promise<void> => {
  if (req.auth) await destroySession(req.auth.token);
  res.clearCookie(SESSION_COOKIE, { path: "/" });
  res.status(204).end();
});

router.get("/auth/me", async (req: Request, res: Response): Promise<void> => {
  if (!req.auth) {
    res.status(401).json({ error: "Não autenticado." });
    return;
  }
  res.json(GetMeResponse.parse(buildSession(req.auth.token, req.auth.user, req.auth.barbershop)));
});

router.get("/barbershops/:slug/exists", async (req: Request, res: Response): Promise<void> => {
  const raw = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
  const slug = slugify(raw);
  const [shop] = await db.select().from(barbershopsTable).where(eq(barbershopsTable.slug, slug)).limit(1);
  res.json({ exists: !!shop, name: shop?.name ?? null });
});

router.post("/auth/push-token", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
  if (token && !token.startsWith("ExponentPushToken")) {
    res.status(400).json({ error: "Token de push inválido." });
    return;
  }
  await db.update(usersTable)
    .set({ expoPushToken: token || null })
    .where(eq(usersTable.id, req.auth!.user.id));
  res.json({ ok: true });
});

export default router;
