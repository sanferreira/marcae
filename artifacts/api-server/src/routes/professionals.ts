import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq } from "drizzle-orm";
import { db, professionalsTable } from "@workspace/db";
import { requireAuth, requireRole } from "../lib/auth";
import { ProfessionalCreate, ProfessionalUpdate, ScheduleSchema, DEFAULT_SCHEDULE } from "../lib/schemas";
import { serializeProfessional } from "../lib/serializers";

const router: IRouter = Router();
router.use(requireAuth);

router.get("/professionals", async (req: Request, res: Response): Promise<void> => {
  const shop = req.auth!.barbershop.id;
  const rows = await db.select().from(professionalsTable).where(eq(professionalsTable.barbershopId, shop));
  res.json(rows.map(serializeProfessional));
});

router.post("/professionals", requireRole("admin"), async (req: Request, res: Response): Promise<void> => {
  const parsed = ProfessionalCreate.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }); return; }
  const shop = req.auth!.barbershop.id;
  const initials = parsed.data.avatar || parsed.data.name.trim().split(/\s+/).map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();
  const [row] = await db.insert(professionalsTable).values({
    barbershopId: shop,
    name: parsed.data.name,
    specialty: parsed.data.specialty,
    bio: parsed.data.bio,
    avatar: initials,
    phone: parsed.data.phone ?? null,
    email: parsed.data.email ?? null,
    commissionRate: parsed.data.commissionRate,
    isAvailable: parsed.data.isAvailable,
    rating: String(parsed.data.rating),
    appointmentsCount: parsed.data.appointmentsCount,
    schedule: parsed.data.schedule ?? DEFAULT_SCHEDULE,
  }).returning();
  res.status(201).json(serializeProfessional(row));
});

router.patch("/professionals/:id", requireRole("admin"), async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = ProfessionalUpdate.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }); return; }
  const shop = req.auth!.barbershop.id;
  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.specialty !== undefined) updates.specialty = parsed.data.specialty;
  if (parsed.data.bio !== undefined) updates.bio = parsed.data.bio;
  if (parsed.data.avatar !== undefined) updates.avatar = parsed.data.avatar;
  if (parsed.data.phone !== undefined) updates.phone = parsed.data.phone;
  if (parsed.data.email !== undefined) updates.email = parsed.data.email;
  if (parsed.data.commissionRate !== undefined) updates.commissionRate = parsed.data.commissionRate;
  if (parsed.data.isAvailable !== undefined) updates.isAvailable = parsed.data.isAvailable;
  if (parsed.data.rating !== undefined) updates.rating = String(parsed.data.rating);
  if (parsed.data.appointmentsCount !== undefined) updates.appointmentsCount = parsed.data.appointmentsCount;
  if (parsed.data.schedule !== undefined) updates.schedule = parsed.data.schedule;
  const [row] = await db.update(professionalsTable).set(updates)
    .where(and(eq(professionalsTable.id, id), eq(professionalsTable.barbershopId, shop))).returning();
  if (!row) { res.status(404).json({ error: "Profissional não encontrado." }); return; }
  res.json(serializeProfessional(row));
});

router.patch("/professionals/:id/schedule", requireRole("admin", "employee"), async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = ScheduleSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Agenda inválida." }); return; }
  const shop = req.auth!.barbershop.id;
  const [row] = await db.update(professionalsTable).set({ schedule: parsed.data })
    .where(and(eq(professionalsTable.id, id), eq(professionalsTable.barbershopId, shop))).returning();
  if (!row) { res.status(404).json({ error: "Profissional não encontrado." }); return; }
  res.json(serializeProfessional(row));
});

export default router;
