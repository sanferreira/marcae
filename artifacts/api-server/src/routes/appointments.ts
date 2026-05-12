import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq, inArray, desc } from "drizzle-orm";
import {
  db, appointmentsTable, appointmentServicesTable, clientsTable,
  professionalsTable, servicesTable,
  loyaltySettingsTable, loyaltyMovementsTable,
} from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { AppointmentCreate, AppointmentUpdate } from "../lib/schemas";
import { serializeAppointment } from "../lib/serializers";

const router: IRouter = Router();
router.use(requireAuth);

// GET /appointments — admin/employee see all; client sees only own.
router.get("/appointments", async (req: Request, res: Response): Promise<void> => {
  const shop = req.auth!.barbershop.id;
  const auth = req.auth!;
  const baseCond = eq(appointmentsTable.barbershopId, shop);
  let apts;
  if (auth.user.role === "client") {
    if (!auth.user.clientId) { res.json([]); return; }
    apts = await db.select().from(appointmentsTable)
      .where(and(baseCond, eq(appointmentsTable.clientId, auth.user.clientId)))
      .orderBy(desc(appointmentsTable.createdAt));
  } else {
    apts = await db.select().from(appointmentsTable)
      .where(baseCond).orderBy(desc(appointmentsTable.createdAt));
  }
  if (apts.length === 0) { res.json([]); return; }
  const ids = apts.map((a) => a.id);
  const allServices = await db.select().from(appointmentServicesTable)
    .where(inArray(appointmentServicesTable.appointmentId, ids));
  const grouped = new Map<string, typeof allServices>();
  for (const s of allServices) {
    const list = grouped.get(s.appointmentId) ?? [];
    list.push(s);
    grouped.set(s.appointmentId, list);
  }
  res.json(apts.map((a) => serializeAppointment(a, grouped.get(a.id) ?? [])));
});

router.post("/appointments", async (req: Request, res: Response): Promise<void> => {
  const parsed = AppointmentCreate.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }); return; }
  const shop = req.auth!.barbershop.id;
  const auth = req.auth!;

  // Client may only book for themselves
  if (auth.user.role === "client" && auth.user.clientId !== parsed.data.clientId) {
    res.status(403).json({ error: "Cliente só pode marcar para si mesmo." });
    return;
  }

  // Tenant validation: client + professional + every service must belong to this shop
  const [clientRow] = await db.select().from(clientsTable)
    .where(and(eq(clientsTable.id, parsed.data.clientId), eq(clientsTable.barbershopId, shop))).limit(1);
  if (!clientRow) { res.status(400).json({ error: "Cliente inválido para esta barbearia." }); return; }

  const [profRow] = await db.select().from(professionalsTable)
    .where(and(eq(professionalsTable.id, parsed.data.professionalId), eq(professionalsTable.barbershopId, shop))).limit(1);
  if (!profRow) { res.status(400).json({ error: "Profissional inválido para esta barbearia." }); return; }

  const svcIds = parsed.data.services.map((s: { id: string }) => s.id);
  if (svcIds.length === 0) { res.status(400).json({ error: "Selecione ao menos um serviço." }); return; }
  const ownedServices = await db.select().from(servicesTable)
    .where(and(eq(servicesTable.barbershopId, shop), inArray(servicesTable.id, svcIds)));
  if (ownedServices.length !== svcIds.length) {
    res.status(400).json({ error: "Serviço inválido para esta barbearia." });
    return;
  }

  // Conflict: same professional, same date+time, not cancelled
  const conflict = await db.select().from(appointmentsTable).where(and(
    eq(appointmentsTable.barbershopId, shop),
    eq(appointmentsTable.professionalId, parsed.data.professionalId),
    eq(appointmentsTable.date, parsed.data.date),
    eq(appointmentsTable.time, parsed.data.time),
  )).limit(5);
  if (conflict.some((c) => c.status !== "cancelled")) {
    res.status(409).json({ error: "Esse horário já está ocupado para o profissional." });
    return;
  }

  const [appt] = await db.insert(appointmentsTable).values({
    barbershopId: shop,
    clientId: parsed.data.clientId,
    clientName: parsed.data.clientName,
    professionalId: parsed.data.professionalId,
    professionalName: parsed.data.professionalName,
    date: parsed.data.date,
    time: parsed.data.time,
    totalPrice: String(parsed.data.totalPrice),
    totalDuration: parsed.data.totalDuration,
    status: parsed.data.status,
    paymentMethod: parsed.data.paymentMethod ?? null,
    isFreeByLoyalty: parsed.data.isFreeByLoyalty,
  }).returning();
  const services = await db.insert(appointmentServicesTable).values(
    parsed.data.services.map((s: { id: string; name: string; price: number; duration: number }) => ({
      appointmentId: appt.id,
      serviceId: s.id,
      serviceName: s.name,
      servicePrice: String(s.price),
      serviceDuration: s.duration,
    })),
  ).returning();
  res.status(201).json(serializeAppointment(appt, services));
});

router.patch("/appointments/:id", async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = AppointmentUpdate.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }); return; }
  const shop = req.auth!.barbershop.id;
  const auth = req.auth!;

  const [existing] = await db.select().from(appointmentsTable)
    .where(and(eq(appointmentsTable.id, id), eq(appointmentsTable.barbershopId, shop))).limit(1);
  if (!existing) { res.status(404).json({ error: "Agendamento não encontrado." }); return; }

  // Client restrictions: only own appointments, only allowed to cancel.
  if (auth.user.role === "client") {
    if (existing.clientId !== auth.user.clientId) {
      res.status(403).json({ error: "Acesso negado." });
      return;
    }
    const allowedStatus = parsed.data.status === "cancelled" || parsed.data.status === undefined;
    const onlyStatusFields =
      parsed.data.paymentMethod === undefined && parsed.data.date === undefined && parsed.data.time === undefined;
    if (!allowedStatus || !onlyStatusFields) {
      res.status(403).json({ error: "Cliente só pode cancelar o próprio agendamento." });
      return;
    }
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;
  if (parsed.data.paymentMethod !== undefined) updates.paymentMethod = parsed.data.paymentMethod;
  if (parsed.data.date !== undefined) updates.date = parsed.data.date;
  if (parsed.data.time !== undefined) updates.time = parsed.data.time;
  if (parsed.data.date !== undefined || parsed.data.time !== undefined) {
    if (updates.status === undefined) updates.status = "confirmed";
  }

  // Atomic transition for loyalty side effects: only when *this* update flips
  // status from non-completed → completed. Use a conditional UPDATE so two
  // concurrent PATCHes can't both mark it completed and double-increment.
  const isCompletingNow =
    parsed.data.status === "completed" && existing.status !== "completed";

  let updated;
  if (isCompletingNow) {
    const [maybe] = await db.update(appointmentsTable)
      .set(updates)
      .where(and(
        eq(appointmentsTable.id, id),
        eq(appointmentsTable.barbershopId, shop),
        eq(appointmentsTable.status, existing.status),
      ))
      .returning();
    if (!maybe) {
      // Lost the race — re-read and return without applying loyalty side effects
      const [fresh] = await db.select().from(appointmentsTable)
        .where(and(eq(appointmentsTable.id, id), eq(appointmentsTable.barbershopId, shop))).limit(1);
      const services = await db.select().from(appointmentServicesTable)
        .where(eq(appointmentServicesTable.appointmentId, id));
      res.json(serializeAppointment(fresh!, services));
      return;
    }
    updated = maybe;

    if (!existing.isFreeByLoyalty) {
      const [settings] = await db.select().from(loyaltySettingsTable)
        .where(eq(loyaltySettingsTable.barbershopId, shop)).limit(1);
      const cap = settings?.requiredPoints ?? 10;
      const [client] = await db.select().from(clientsTable)
        .where(and(eq(clientsTable.id, existing.clientId), eq(clientsTable.barbershopId, shop))).limit(1);
      if (client) {
        const newPts = Math.min(client.loyaltyPoints + 1, cap);
        const today = new Date().toISOString().split("T")[0];
        await db.update(clientsTable).set({
          loyaltyPoints: newPts,
          lastVisit: today,
          appointmentsCount: client.appointmentsCount + 1,
          totalSpent: String(parseFloat(client.totalSpent) + parseFloat(existing.totalPrice)),
        }).where(and(eq(clientsTable.id, client.id), eq(clientsTable.barbershopId, shop)));
        await db.insert(loyaltyMovementsTable).values({
          barbershopId: shop,
          clientId: client.id,
          date: today,
          points: 1,
          description: "Atendimento concluído",
          type: "earned",
        });
      }
    }
  } else {
    [updated] = await db.update(appointmentsTable).set(updates)
      .where(and(eq(appointmentsTable.id, id), eq(appointmentsTable.barbershopId, shop))).returning();
  }

  const services = await db.select().from(appointmentServicesTable)
    .where(eq(appointmentServicesTable.appointmentId, id));
  res.json(serializeAppointment(updated, services));
});

export default router;
