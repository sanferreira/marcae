import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq, desc } from "drizzle-orm";
import { db, clientsTable, loyaltyMovementsTable, loyaltySettingsTable } from "@workspace/db";
import { requireAuth, requireRole } from "../lib/auth";
import { ClientCreate, LoyaltyAdjust, LoyaltySettingsUpdate } from "../lib/schemas";
import { serializeClient, serializeLoyaltyMovement, serializeLoyaltySettings } from "../lib/serializers";

const router: IRouter = Router();
router.use(requireAuth);

// Clients can only see their own row; admins/employees see all in tenant.
router.get("/clients", async (req: Request, res: Response): Promise<void> => {
  const shop = req.auth!.barbershop.id;
  const auth = req.auth!;
  if (auth.user.role === "client") {
    if (!auth.user.clientId) { res.json([]); return; }
    const rows = await db.select().from(clientsTable)
      .where(and(eq(clientsTable.barbershopId, shop), eq(clientsTable.id, auth.user.clientId)));
    res.json(rows.map(serializeClient));
    return;
  }
  const rows = await db.select().from(clientsTable).where(eq(clientsTable.barbershopId, shop));
  res.json(rows.map(serializeClient));
});

router.post("/clients", requireRole("admin", "employee"), async (req: Request, res: Response): Promise<void> => {
  const parsed = ClientCreate.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }); return; }
  const shop = req.auth!.barbershop.id;
  const [row] = await db.insert(clientsTable).values({
    barbershopId: shop,
    name: parsed.data.name,
    phone: parsed.data.phone,
    email: parsed.data.email,
    birthDate: parsed.data.birthDate ?? null,
    notes: parsed.data.notes ?? null,
  }).returning();
  res.status(201).json(serializeClient(row));
});

router.get("/clients/:id/loyalty", async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const shop = req.auth!.barbershop.id;
  const auth = req.auth!;
  // Clients can only fetch their own loyalty
  if (auth.user.role === "client" && auth.user.clientId !== id) {
    res.status(403).json({ error: "Acesso negado." });
    return;
  }
  const [client] = await db.select().from(clientsTable)
    .where(and(eq(clientsTable.id, id), eq(clientsTable.barbershopId, shop))).limit(1);
  if (!client) { res.status(404).json({ error: "Cliente não encontrado." }); return; }
  const [settings] = await db.select().from(loyaltySettingsTable)
    .where(eq(loyaltySettingsTable.barbershopId, shop)).limit(1);
  const history = await db.select().from(loyaltyMovementsTable)
    .where(and(eq(loyaltyMovementsTable.barbershopId, shop), eq(loyaltyMovementsTable.clientId, id)))
    .orderBy(desc(loyaltyMovementsTable.createdAt));
  res.json({
    currentPoints: client.loyaltyPoints,
    requiredPoints: settings?.requiredPoints ?? 10,
    benefitDescription: settings?.benefitDescription ?? "Corte gratuito",
    history: history.map(serializeLoyaltyMovement),
  });
});

router.post("/clients/:id/loyalty/adjust", requireRole("admin"), async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = LoyaltyAdjust.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }); return; }
  const shop = req.auth!.barbershop.id;
  const [client] = await db.select().from(clientsTable)
    .where(and(eq(clientsTable.id, id), eq(clientsTable.barbershopId, shop))).limit(1);
  if (!client) { res.status(404).json({ error: "Cliente não encontrado." }); return; }
  const [settings] = await db.select().from(loyaltySettingsTable)
    .where(eq(loyaltySettingsTable.barbershopId, shop)).limit(1);
  const cap = settings?.requiredPoints ?? 10;
  const newPts = Math.max(0, Math.min(client.loyaltyPoints + parsed.data.points, cap));
  await db.update(clientsTable).set({ loyaltyPoints: newPts })
    .where(and(eq(clientsTable.id, id), eq(clientsTable.barbershopId, shop)));
  const today = new Date().toISOString().split("T")[0];
  await db.insert(loyaltyMovementsTable).values({
    barbershopId: shop,
    clientId: id,
    date: today,
    points: Math.abs(parsed.data.points),
    description: parsed.data.description,
    type: parsed.data.points >= 0 ? "adjusted" : "redeemed",
  });
  res.json({
    currentPoints: newPts,
    requiredPoints: cap,
    benefitDescription: settings?.benefitDescription ?? "Corte gratuito",
  });
});

router.get("/loyalty/settings", async (req: Request, res: Response): Promise<void> => {
  const shop = req.auth!.barbershop.id;
  let [s] = await db.select().from(loyaltySettingsTable)
    .where(eq(loyaltySettingsTable.barbershopId, shop)).limit(1);
  if (!s) {
    [s] = await db.insert(loyaltySettingsTable).values({ barbershopId: shop }).returning();
  }
  res.json(serializeLoyaltySettings(s));
});

router.patch("/loyalty/settings", requireRole("admin"), async (req: Request, res: Response): Promise<void> => {
  const parsed = LoyaltySettingsUpdate.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }); return; }
  const shop = req.auth!.barbershop.id;
  await db.insert(loyaltySettingsTable).values({
    barbershopId: shop,
    requiredPoints: parsed.data.requiredPoints,
    benefitDescription: parsed.data.benefitDescription,
  }).onConflictDoUpdate({
    target: loyaltySettingsTable.barbershopId,
    set: { requiredPoints: parsed.data.requiredPoints, benefitDescription: parsed.data.benefitDescription },
  });
  const [s] = await db.select().from(loyaltySettingsTable)
    .where(eq(loyaltySettingsTable.barbershopId, shop)).limit(1);
  res.json(serializeLoyaltySettings(s!));
});

export default router;
