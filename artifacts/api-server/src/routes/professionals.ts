import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq, inArray } from "drizzle-orm";
import { appointmentsTable, db, professionalsTable, professionalServicesTable, servicesTable, usersTable } from "@workspace/db";
import { requireAuth, requireRole } from "../lib/auth";
import { getPlanLimits } from "../lib/plans";
import { ProfessionalCreate, ProfessionalUpdate, ScheduleSchema, DEFAULT_SCHEDULE } from "../lib/schemas";
import { serializeProfessional } from "../lib/serializers";

const router: IRouter = Router();
router.use(requireAuth);

async function validateServiceIds(shop: string, serviceIds: string[]): Promise<boolean> {
  const uniqueIds = Array.from(new Set(serviceIds));
  if (uniqueIds.length === 0) return true;
  const rows = await db.select({ id: servicesTable.id }).from(servicesTable)
    .where(and(eq(servicesTable.barbershopId, shop), inArray(servicesTable.id, uniqueIds)));
  return rows.length === uniqueIds.length;
}

async function getProfessionalServiceIds(professionalId: string): Promise<string[]> {
  const rows = await db.select({ serviceId: professionalServicesTable.serviceId }).from(professionalServicesTable)
    .where(eq(professionalServicesTable.professionalId, professionalId));
  return rows.map((row) => row.serviceId);
}

async function replaceProfessionalServices(professionalId: string, serviceIds: string[]): Promise<void> {
  const uniqueIds = Array.from(new Set(serviceIds));
  await db.delete(professionalServicesTable)
    .where(eq(professionalServicesTable.professionalId, professionalId));
  if (uniqueIds.length > 0) {
    await db.insert(professionalServicesTable).values(
      uniqueIds.map((serviceId) => ({ professionalId, serviceId })),
    );
  }
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function normalizePhone(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

async function findProfessionalDuplicate(
  shop: string,
  data: { email?: string | null; phone?: string | null },
  ignoreId?: string,
) {
  const rows = await db.select().from(professionalsTable)
    .where(eq(professionalsTable.barbershopId, shop));
  const email = normalize(data.email);
  const phone = normalizePhone(data.phone);

  return rows.find((professional) => {
    if (professional.id === ignoreId) return false;
    if (email && normalize(professional.email) === email) return true;
    if (phone && normalizePhone(professional.phone) === phone) return true;
    return false;
  });
}

router.get("/professionals", async (req: Request, res: Response): Promise<void> => {
  const shop = req.auth!.barbershop.id;
  const rows = await db.select().from(professionalsTable).where(eq(professionalsTable.barbershopId, shop));
  if (rows.length === 0) {
    res.json([]);
    return;
  }

  const professionalIds = rows.map((row) => row.id);
  const serviceRows = await db.select().from(professionalServicesTable)
    .where(inArray(professionalServicesTable.professionalId, professionalIds));
  const grouped = new Map<string, string[]>();
  for (const row of serviceRows) {
    const list = grouped.get(row.professionalId) ?? [];
    list.push(row.serviceId);
    grouped.set(row.professionalId, list);
  }

  res.json(rows.map((row) => serializeProfessional(row, grouped.get(row.id) ?? [])));
});

router.post("/professionals", requireRole("admin"), async (req: Request, res: Response): Promise<void> => {
  const parsed = ProfessionalCreate.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Dados invalidos" });
    return;
  }

  const shop = req.auth!.barbershop.id;
  const limits = getPlanLimits(req.auth!.barbershop.plan);
  const existingProfessionals = await db.select({ id: professionalsTable.id }).from(professionalsTable)
    .where(eq(professionalsTable.barbershopId, shop));
  if (existingProfessionals.length >= limits.professionals) {
    const label = limits.professionals === 1 ? "profissional" : "profissionais";
    res.status(402).json({
      error: `Seu plano permite ate ${limits.professionals} ${label}. Faça upgrade para adicionar mais.`,
      code: "plan_limit_reached",
      limit: "professionals",
      current: existingProfessionals.length,
      max: limits.professionals,
    });
    return;
  }

  if (!(await validateServiceIds(shop, parsed.data.serviceIds))) {
    res.status(400).json({ error: "Servico invalido para este estabelecimento." });
    return;
  }

  const duplicate = await findProfessionalDuplicate(shop, parsed.data);
  if (duplicate) {
    res.status(409).json({ error: "Ja existe um profissional com este email ou telefone neste estabelecimento." });
    return;
  }

  const initials = parsed.data.avatar || parsed.data.name.trim().split(/\s+/).map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();
  const [row] = await db.insert(professionalsTable).values({
    barbershopId: shop,
    name: parsed.data.name,
    specialty: parsed.data.specialty,
    bio: parsed.data.bio,
    avatar: initials,
    avatarImage: parsed.data.avatarImage ?? null,
    phone: parsed.data.phone ?? null,
    email: parsed.data.email ?? null,
    commissionRate: parsed.data.commissionRate,
    isAvailable: parsed.data.isAvailable,
    rating: String(parsed.data.rating),
    appointmentsCount: parsed.data.appointmentsCount,
    schedule: parsed.data.schedule ?? DEFAULT_SCHEDULE,
  }).returning();

  await replaceProfessionalServices(row.id, parsed.data.serviceIds);
  res.status(201).json(serializeProfessional(row, Array.from(new Set(parsed.data.serviceIds))));
});

router.patch("/professionals/:id", requireRole("admin"), async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = ProfessionalUpdate.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Dados invalidos" });
    return;
  }

  const shop = req.auth!.barbershop.id;
  if (parsed.data.serviceIds !== undefined && !(await validateServiceIds(shop, parsed.data.serviceIds))) {
    res.status(400).json({ error: "Servico invalido para este estabelecimento." });
    return;
  }

  const [current] = await db.select().from(professionalsTable)
    .where(and(eq(professionalsTable.id, id), eq(professionalsTable.barbershopId, shop)))
    .limit(1);
  if (!current) {
    res.status(404).json({ error: "Profissional nao encontrado." });
    return;
  }

  const identityChanged =
    (parsed.data.email !== undefined && normalize(parsed.data.email) !== normalize(current.email)) ||
    (parsed.data.phone !== undefined && normalizePhone(parsed.data.phone) !== normalizePhone(current.phone));
  if (identityChanged) {
    const duplicate = await findProfessionalDuplicate(shop, {
      email: parsed.data.email !== undefined ? parsed.data.email : current.email,
      phone: parsed.data.phone !== undefined ? parsed.data.phone : current.phone,
    }, id);
    if (duplicate) {
      res.status(409).json({ error: "Ja existe um profissional com este email ou telefone neste estabelecimento." });
      return;
    }
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.specialty !== undefined) updates.specialty = parsed.data.specialty;
  if (parsed.data.bio !== undefined) updates.bio = parsed.data.bio;
  if (parsed.data.avatar !== undefined) updates.avatar = parsed.data.avatar;
  if (parsed.data.avatarImage !== undefined) updates.avatarImage = parsed.data.avatarImage;
  if (parsed.data.phone !== undefined) updates.phone = parsed.data.phone;
  if (parsed.data.email !== undefined) updates.email = parsed.data.email;
  if (parsed.data.commissionRate !== undefined) updates.commissionRate = parsed.data.commissionRate;
  if (parsed.data.isAvailable !== undefined) updates.isAvailable = parsed.data.isAvailable;
  if (parsed.data.rating !== undefined) updates.rating = String(parsed.data.rating);
  if (parsed.data.appointmentsCount !== undefined) updates.appointmentsCount = parsed.data.appointmentsCount;
  if (parsed.data.schedule !== undefined) updates.schedule = parsed.data.schedule;

  const [row] = Object.keys(updates).length > 0
    ? await db.update(professionalsTable).set(updates)
      .where(and(eq(professionalsTable.id, id), eq(professionalsTable.barbershopId, shop))).returning()
    : [current];
  if (!row) {
    res.status(404).json({ error: "Profissional nao encontrado." });
    return;
  }

  if (parsed.data.serviceIds !== undefined) {
    await replaceProfessionalServices(row.id, parsed.data.serviceIds);
  }
  const serviceIds = parsed.data.serviceIds !== undefined
    ? Array.from(new Set(parsed.data.serviceIds))
    : await getProfessionalServiceIds(row.id);

  res.json(serializeProfessional(row, serviceIds));
});

router.delete("/professionals/:id", requireRole("admin"), async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const shop = req.auth!.barbershop.id;

  const [professional] = await db.select({ id: professionalsTable.id }).from(professionalsTable)
    .where(and(eq(professionalsTable.id, id), eq(professionalsTable.barbershopId, shop)))
    .limit(1);
  if (!professional) {
    res.status(404).json({ error: "Profissional nao encontrado." });
    return;
  }

  const [appointment] = await db.select({ id: appointmentsTable.id }).from(appointmentsTable)
    .where(and(
      eq(appointmentsTable.barbershopId, shop),
      eq(appointmentsTable.professionalId, id),
    ))
    .limit(1);
  if (appointment) {
    res.status(409).json({
      error: "Este profissional possui agendamentos no historico. Para preservar os dados, marque como indisponivel em vez de excluir.",
    });
    return;
  }

  await db.transaction(async (tx) => {
    await tx.delete(usersTable)
      .where(and(eq(usersTable.barbershopId, shop), eq(usersTable.role, "employee"), eq(usersTable.professionalId, id)));
    await tx.delete(professionalServicesTable)
      .where(eq(professionalServicesTable.professionalId, id));
    await tx.delete(professionalsTable)
      .where(and(eq(professionalsTable.id, id), eq(professionalsTable.barbershopId, shop)));
  });

  res.status(204).end();
});

router.patch("/professionals/:id/schedule", requireRole("admin", "employee"), async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = ScheduleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Agenda invalida." });
    return;
  }

  const shop = req.auth!.barbershop.id;
  const [row] = await db.update(professionalsTable).set({ schedule: parsed.data })
    .where(and(eq(professionalsTable.id, id), eq(professionalsTable.barbershopId, shop))).returning();
  if (!row) {
    res.status(404).json({ error: "Profissional nao encontrado." });
    return;
  }

  res.json(serializeProfessional(row, await getProfessionalServiceIds(row.id)));
});

export default router;
