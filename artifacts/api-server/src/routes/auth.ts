import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq, ne } from "drizzle-orm";
import { db, barbershopsTable, usersTable, clientsTable, loyaltySettingsTable, professionalsTable } from "@workspace/db";
import {
  RegisterShopBody,
  RegisterClientBody,
  LoginBody,
  LoginResponse,
  GetMeResponse,
} from "@workspace/api-zod";
import { SelfProfileUpdate } from "../lib/schemas";
import { hashPassword, verifyPassword } from "../lib/password";
import { createSession, destroySession, isCookieAuthEnabled, SESSION_COOKIE } from "../lib/sessions";
import { passwordPolicyError, rateLimit } from "../lib/security";
import { computePlanStatus, serializeBarbershop, serializeUser, slugify } from "../lib/serializers";
import { requireAuth } from "../lib/auth";
import { isExpoPushToken } from "../lib/push";

const router: IRouter = Router();

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 30 * 86400 * 1000,
};

function setSessionCookie(res: Response, token: string): void {
  if (isCookieAuthEnabled()) res.cookie(SESSION_COOKIE, token, COOKIE_OPTS);
}

function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, {
    path: COOKIE_OPTS.path,
    httpOnly: COOKIE_OPTS.httpOnly,
    secure: COOKIE_OPTS.secure,
    sameSite: COOKIE_OPTS.sameSite,
  });
}

const authWriteLimiter = rateLimit({
  keyPrefix: "auth_write",
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.",
});

const loginLimiter = rateLimit({
  keyPrefix: "login",
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Muitas tentativas de login. Aguarde alguns minutos antes de tentar novamente.",
});

function buildSession(token: string, user: Parameters<typeof serializeUser>[0], shop: Parameters<typeof serializeBarbershop>[0]) {
  return {
    token,
    user: serializeUser(user),
    barbershop: serializeBarbershop(shop),
    planStatus: computePlanStatus(shop),
  };
}

router.post("/auth/register-shop", authWriteLimiter, async (req: Request, res: Response): Promise<void> => {
  const parsed = RegisterShopBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" });
    return;
  }
  const slug = slugify(parsed.data.slug);
  if (!slug) {
    res.status(400).json({ error: "ID do estabelecimento inválido." });
    return;
  }
  const passwordError = passwordPolicyError(parsed.data.password);
  if (passwordError) {
    res.status(400).json({ error: passwordError });
    return;
  }
  const existing = await db.select().from(barbershopsTable).where(eq(barbershopsTable.slug, slug)).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "Esse ID de estabelecimento já está em uso." });
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
  setSessionCookie(res, token);
  res.status(201).json(LoginResponse.parse(buildSession(token, admin, shop)));
});

router.post("/auth/register-client", authWriteLimiter, async (req: Request, res: Response): Promise<void> => {
  const parsed = RegisterClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" });
    return;
  }
  const slug = slugify(parsed.data.slug);
  const passwordError = passwordPolicyError(parsed.data.password);
  if (passwordError) {
    res.status(400).json({ error: passwordError });
    return;
  }
  const [shop] = await db.select().from(barbershopsTable).where(eq(barbershopsTable.slug, slug)).limit(1);
  if (!shop) {
    res.status(404).json({ error: "Estabelecimento não encontrado." });
    return;
  }
  const email = parsed.data.email.trim().toLowerCase();
  const dup = await db.select().from(usersTable)
    .where(and(eq(usersTable.barbershopId, shop.id), eq(usersTable.email, email)))
    .limit(1);
  if (dup.length > 0) {
    res.status(409).json({ error: "Já existe usuário com esse email neste estabelecimento." });
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
  setSessionCookie(res, token);
  res.status(201).json(LoginResponse.parse(buildSession(token, user, shop)));
});

router.post("/auth/login", loginLimiter, async (req: Request, res: Response): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(401).json({ error: "Credenciais inválidas." });
    return;
  }
  const slug = slugify(parsed.data.slug);
  const email = parsed.data.email.trim().toLowerCase();
  const [shop] = await db.select().from(barbershopsTable).where(eq(barbershopsTable.slug, slug)).limit(1);
  if (!shop) {
    res.status(401).json({ error: "Estabelecimento não encontrado com esse ID." });
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
  setSessionCookie(res, token);
  res.json(LoginResponse.parse(buildSession(token, user, shop)));
});

router.post("/auth/logout", async (req: Request, res: Response): Promise<void> => {
  if (req.auth) await destroySession(req.auth.token);
  clearSessionCookie(res);
  res.status(204).end();
});

router.get("/auth/me", async (req: Request, res: Response): Promise<void> => {
  if (!req.auth) {
    res.status(401).json({ error: "Não autenticado." });
    return;
  }
  res.json(GetMeResponse.parse(buildSession(req.auth.token, req.auth.user, req.auth.barbershop)));
});

router.patch("/auth/me", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const parsed = SelfProfileUpdate.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." });
    return;
  }

  const auth = req.auth!;
  const shopId = auth.barbershop.id;
  const data = parsed.data;
  const userPatch: Record<string, unknown> = {};

  if (data.name !== undefined) userPatch.name = data.name.trim();
  if (data.phone !== undefined) userPatch.phone = data.phone?.trim() || null;
  if (data.avatarImage !== undefined) userPatch.avatarImage = data.avatarImage || null;
  if (data.email !== undefined) {
    const email = data.email.trim().toLowerCase();
    const collision = await db.select().from(usersTable).where(and(
      eq(usersTable.barbershopId, shopId),
      eq(usersTable.email, email),
      ne(usersTable.id, auth.user.id),
    )).limit(1);
    if (collision.length > 0) {
      res.status(409).json({ error: "Email já está em uso por outro usuário." });
      return;
    }
    userPatch.email = email;
  }

  let updatedUser = auth.user;
  if (Object.keys(userPatch).length > 0) {
    const [row] = await db.update(usersTable).set(userPatch).where(eq(usersTable.id, auth.user.id)).returning();
    if (row) updatedUser = row;
  }

  if (auth.user.role === "employee" && auth.user.professionalId) {
    const professionalPatch: Record<string, unknown> = {};
    if (data.name !== undefined) professionalPatch.name = data.name.trim();
    if (data.phone !== undefined) professionalPatch.phone = data.phone?.trim() || null;
    if (data.email !== undefined) professionalPatch.email = data.email.trim().toLowerCase();
    if (data.specialty !== undefined) professionalPatch.specialty = data.specialty.trim();
    if (data.bio !== undefined) professionalPatch.bio = data.bio.trim();
    if (data.avatarImage !== undefined) professionalPatch.avatarImage = data.avatarImage || null;
    if (data.avatar !== undefined) {
      const nextAvatar = data.avatar.trim().toUpperCase();
      professionalPatch.avatar = nextAvatar || updatedUser.name.trim().split(/\s+/).map((n) => n[0]).slice(0, 2).join("").toUpperCase();
    }

    if (Object.keys(professionalPatch).length > 0) {
      await db.update(professionalsTable).set(professionalPatch)
        .where(and(eq(professionalsTable.id, auth.user.professionalId), eq(professionalsTable.barbershopId, shopId)));
    }
  }

  if (auth.user.role === "client" && auth.user.clientId) {
    const clientPatch: Record<string, unknown> = {};
    if (data.name !== undefined) clientPatch.name = data.name.trim();
    if (data.phone !== undefined) clientPatch.phone = data.phone?.trim() || "";
    if (data.email !== undefined) clientPatch.email = data.email.trim().toLowerCase();

    if (Object.keys(clientPatch).length > 0) {
      await db.update(clientsTable).set(clientPatch)
        .where(and(eq(clientsTable.id, auth.user.clientId), eq(clientsTable.barbershopId, shopId)));
    }
  }

  res.json(GetMeResponse.parse(buildSession(auth.token, updatedUser, auth.barbershop)));
});

router.get(["/barbershops/:slug/exists", "/establishments/:slug/exists"], async (req: Request, res: Response): Promise<void> => {
  const raw = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
  const slug = slugify(raw);
  const [shop] = await db.select().from(barbershopsTable).where(eq(barbershopsTable.slug, slug)).limit(1);
  res.json({
    exists: !!shop,
    name: shop?.name ?? null,
    brandPrimary: shop?.brandPrimary ?? null,
    brandAccent: shop?.brandAccent ?? null,
  });
});

router.post("/auth/push-token", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
  if (token && !isExpoPushToken(token)) {
    res.status(400).json({ error: "Token de push inválido." });
    return;
  }
  await db.update(usersTable)
    .set({ expoPushToken: token || null })
    .where(eq(usersTable.id, req.auth!.user.id));
  res.json({ ok: true });
});

export default router;
