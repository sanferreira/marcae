import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq } from "drizzle-orm";
import { db, servicesTable } from "@workspace/db";
import { requireAuth, requireRole } from "../lib/auth";
import { ServiceCreate, ServiceUpdate } from "../lib/schemas";
import { serializeService } from "../lib/serializers";

const router: IRouter = Router();

router.use(requireAuth);

router.get("/services", async (req: Request, res: Response): Promise<void> => {
  const shop = req.auth!.barbershop.id;
  const rows = await db.select().from(servicesTable).where(eq(servicesTable.barbershopId, shop));
  res.json(rows.map(serializeService));
});

router.post("/services", requireRole("admin"), async (req: Request, res: Response): Promise<void> => {
  const parsed = ServiceCreate.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" });
    return;
  }
  const shop = req.auth!.barbershop.id;
  const [row] = await db.insert(servicesTable).values({
    barbershopId: shop,
    name: parsed.data.name,
    price: String(parsed.data.price),
    duration: parsed.data.duration,
    loyaltyPoints: parsed.data.loyaltyPoints,
    description: parsed.data.description,
    category: parsed.data.category,
    isActive: parsed.data.isActive,
  }).returning();
  res.status(201).json(serializeService(row));
});

router.patch("/services/:id", requireRole("admin"), async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = ServiceUpdate.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" });
    return;
  }
  const shop = req.auth!.barbershop.id;
  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.price !== undefined) updates.price = String(parsed.data.price);
  if (parsed.data.duration !== undefined) updates.duration = parsed.data.duration;
  if (parsed.data.loyaltyPoints !== undefined) updates.loyaltyPoints = parsed.data.loyaltyPoints;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;
  if (parsed.data.category !== undefined) updates.category = parsed.data.category;
  if (parsed.data.isActive !== undefined) updates.isActive = parsed.data.isActive;
  const [row] = await db.update(servicesTable).set(updates)
    .where(and(eq(servicesTable.id, id), eq(servicesTable.barbershopId, shop)))
    .returning();
  if (!row) { res.status(404).json({ error: "Serviço não encontrado." }); return; }
  res.json(serializeService(row));
});

router.delete("/services/:id", requireRole("admin"), async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const shop = req.auth!.barbershop.id;
  const [row] = await db.delete(servicesTable)
    .where(and(eq(servicesTable.id, id), eq(servicesTable.barbershopId, shop)))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Servico nao encontrado." });
    return;
  }
  res.status(204).send();
});

export default router;
