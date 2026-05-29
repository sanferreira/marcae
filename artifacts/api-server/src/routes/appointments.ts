import { Router, type IRouter, type Request, type Response } from "express";
import { and, desc, eq, inArray, isNotNull, isNull, ne, or } from "drizzle-orm";
import {
  appointmentServicesTable,
  appointmentsTable,
  cashEntriesTable,
  categoriesTable,
  clientsTable,
  db,
  loyaltyMovementsTable,
  loyaltySettingsTable,
  professionalServicesTable,
  professionalsTable,
  servicesTable,
  usersTable,
} from "@workspace/db";

import { requireAuth } from "../lib/auth";
import { toBusinessDateString } from "../lib/dates";
import { planHasFeature } from "../lib/plans";
import { sendExpoPush } from "../lib/push";
import { AppointmentCreate, AppointmentUpdate } from "../lib/schemas";
import { serializeAppointment } from "../lib/serializers";
import { consumeClientPackageForAppointment } from "./packages";

const router: IRouter = Router();

router.use(requireAuth);

const CLIENT_CHANGE_CUTOFF_HOURS = 48;
const CLIENT_CHANGE_CUTOFF_MS = CLIENT_CHANGE_CUTOFF_HOURS * 60 * 60 * 1000;
const CLIENT_CHANGE_CUTOFF_ERROR =
  "Cancelamentos e reagendamentos pelo cliente precisam ser feitos com pelo menos 48 horas de antecedencia.";
const DAY_KEYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"] as const;
type ScheduleRecord = Record<string, { enabled: boolean; startTime: string; endTime: string }>;
const DEFAULT_BUSINESS_SCHEDULE: ScheduleRecord = {
  seg: { enabled: true, startTime: "08:00", endTime: "18:00" },
  ter: { enabled: true, startTime: "08:00", endTime: "18:00" },
  qua: { enabled: true, startTime: "08:00", endTime: "18:00" },
  qui: { enabled: true, startTime: "08:00", endTime: "18:00" },
  sex: { enabled: true, startTime: "08:00", endTime: "18:00" },
  sab: { enabled: true, startTime: "08:00", endTime: "13:00" },
  dom: { enabled: false, startTime: "08:00", endTime: "12:00" },
};

// GET /appointments - admin/employee see all; client sees only own.
router.get("/appointments", async (req: Request, res: Response): Promise<void> => {
  const shop = req.auth!.barbershop.id;
  const auth = req.auth!;
  const baseCond = eq(appointmentsTable.barbershopId, shop);

  let apts;
  if (auth.user.role === "client") {
    if (!auth.user.clientId) {
      res.json([]);
      return;
    }

    apts = await db.select().from(appointmentsTable)
      .where(and(baseCond, eq(appointmentsTable.clientId, auth.user.clientId)))
      .orderBy(desc(appointmentsTable.createdAt));
  } else {
    apts = await db.select().from(appointmentsTable)
      .where(baseCond)
      .orderBy(desc(appointmentsTable.createdAt));
  }

  if (apts.length === 0) {
    res.json([]);
    return;
  }

  const ids = apts.map((a) => a.id);
  const allServices = await db.select().from(appointmentServicesTable)
    .where(inArray(appointmentServicesTable.appointmentId, ids));
  const grouped = new Map<string, typeof allServices>();

  for (const service of allServices) {
    const list = grouped.get(service.appointmentId) ?? [];
    list.push(service);
    grouped.set(service.appointmentId, list);
  }

  res.json(apts.map((apt) => serializeAppointment(apt, grouped.get(apt.id) ?? [])));
});

router.post("/appointments", async (req: Request, res: Response): Promise<void> => {
  const parsed = AppointmentCreate.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Dados invalidos" });
    return;
  }

  const shop = req.auth!.barbershop.id;
  const auth = req.auth!;
  const bufferMinutes = req.auth!.barbershop.bookingBufferMinutes ?? 0;
  const shopConfig = req.auth!.barbershop as { bookingAvailabilityMode?: string };
  const availabilityMode: "duration_buffer" | "release_on_complete" =
    shopConfig.bookingAvailabilityMode === "release_on_complete"
      ? "release_on_complete"
      : "duration_buffer";

  if (auth.user.role === "client" && auth.user.clientId !== parsed.data.clientId) {
    res.status(403).json({ error: "Cliente so pode marcar para si mesmo." });
    return;
  }

  const [clientRow] = await db.select().from(clientsTable)
    .where(and(
      eq(clientsTable.id, parsed.data.clientId),
      eq(clientsTable.barbershopId, shop),
      isNull(clientsTable.archivedAt),
    ))
    .limit(1);
  if (!clientRow) {
    res.status(400).json({ error: "Cliente invalido para este estabelecimento." });
    return;
  }

  const [profRow] = await db.select().from(professionalsTable)
    .where(and(
      eq(professionalsTable.id, parsed.data.professionalId),
      eq(professionalsTable.barbershopId, shop),
      isNull(professionalsTable.archivedAt),
    ))
    .limit(1);
  if (!profRow) {
    res.status(400).json({ error: "Profissional invalido para este estabelecimento." });
    return;
  }

  const serviceIds = parsed.data.services.map((service: { id: string }) => service.id);
  if (serviceIds.length === 0) {
    res.status(400).json({ error: "Selecione ao menos um servico." });
    return;
  }

  const ownedServices = await db.select().from(servicesTable)
    .where(and(
      eq(servicesTable.barbershopId, shop),
      inArray(servicesTable.id, serviceIds),
    ));
  if (ownedServices.length !== serviceIds.length) {
    res.status(400).json({ error: "Servico invalido para este estabelecimento." });
    return;
  }

  const assignedServices = await db.select({ serviceId: professionalServicesTable.serviceId })
    .from(professionalServicesTable)
    .where(eq(professionalServicesTable.professionalId, parsed.data.professionalId));
  if (assignedServices.length > 0) {
    const assignedServiceIds = new Set(assignedServices.map((service) => service.serviceId));
    const hasUnsupportedService = serviceIds.some((serviceId) => !assignedServiceIds.has(serviceId));
    if (hasUnsupportedService) {
      res.status(400).json({ error: "Profissional nao atende um ou mais servicos selecionados." });
      return;
    }
  }

  if (!fitsSchedule((req.auth!.barbershop as { businessSchedule?: ScheduleRecord }).businessSchedule, parsed.data.date, parsed.data.time, parsed.data.totalDuration)) {
    res.status(409).json({ error: "Horario fora do funcionamento do estabelecimento." });
    return;
  }
  if (!fitsSchedule(profRow.schedule as ScheduleRecord, parsed.data.date, parsed.data.time, parsed.data.totalDuration)) {
    res.status(409).json({ error: "Horario fora da escala do profissional." });
    return;
  }

  const conflicts = await db.select().from(appointmentsTable).where(and(
    eq(appointmentsTable.barbershopId, shop),
    eq(appointmentsTable.date, parsed.data.date),
    or(
      eq(appointmentsTable.professionalId, parsed.data.professionalId),
      eq(appointmentsTable.clientId, parsed.data.clientId),
    ),
  ));
  const activeConflicts = conflicts.filter((apt) => isBlockingStatus(apt.status, availabilityMode));
  const professionalOverlap = activeConflicts.some((apt) =>
    apt.professionalId === parsed.data.professionalId &&
    hasBufferedConflict(apt.time, apt.totalDuration, parsed.data.time, parsed.data.totalDuration, bufferMinutes));
  if (professionalOverlap) {
    res.status(409).json({ error: "Esse horario conflita com outro atendimento do profissional." });
    return;
  }
  const clientOverlap = activeConflicts.some((apt) =>
    apt.clientId === parsed.data.clientId &&
    hasBufferedConflict(apt.time, apt.totalDuration, parsed.data.time, parsed.data.totalDuration, bufferMinutes));
  if (clientOverlap) {
    res.status(409).json({ error: "Voce ja possui outro agendamento nesse horario." });
    return;
  }

  const [appointment] = await db.insert(appointmentsTable).values({
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
    clientNotes: parsed.data.clientNotes,
  }).returning();

  const services = await db.insert(appointmentServicesTable).values(
    parsed.data.services.map((service: { id: string; name: string; price: number; duration: number }) => ({
      appointmentId: appointment.id,
      serviceId: service.id,
      serviceName: service.name,
      servicePrice: String(service.price),
      serviceDuration: service.duration,
    })),
  ).returning();

  if (planHasFeature(req.auth!.barbershop.plan, "notifications")) void (async () => {
    try {
      const serviceNames = parsed.data.services.map((service) => service.name).join(" + ");
      const dateLabel = formatDateBR(parsed.data.date);
      if (auth.user.role !== "client") {
        await sendClientAppointmentPush(
          shop,
          parsed.data.clientId,
          "Novo agendamento",
          `Seu atendimento ${serviceNames} foi marcado com ${parsed.data.professionalName} para ${dateLabel} as ${parsed.data.time}.`,
          appointment.id,
        );
      }
      await sendStaffAppointmentPush(
        shop,
        parsed.data.professionalId,
        "Novo agendamento",
        `${parsed.data.clientName} marcou ${serviceNames} com ${parsed.data.professionalName} em ${dateLabel} as ${parsed.data.time}.`,
        appointment.id,
        "appointment.created",
      );
    } catch (err) {
      req.log.warn({ err, appointmentId: appointment.id }, "failed to dispatch appointment push notifications");
    }
  })();

  res.status(201).json(serializeAppointment(appointment, services));
});

function formatDateBR(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

function appointmentDateTime(date: string, time: string): Date | null {
  const value = new Date(`${date}T${time}:00`);
  return Number.isNaN(value.getTime()) ? null : value;
}

function isWithinClientChangeCutoff(date: string, time: string, now = new Date()): boolean {
  const scheduledAt = appointmentDateTime(date, time);
  if (!scheduledAt) return true;
  return scheduledAt.getTime() - now.getTime() < CLIENT_CHANGE_CUTOFF_MS;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return (hours * 60) + minutes;
}

function fitsSchedule(
  schedule: ScheduleRecord | null | undefined,
  date: string,
  time: string,
  duration: number,
): boolean {
  const day = DAY_KEYS[new Date(`${date}T12:00:00`).getDay()];
  const row = (schedule ?? DEFAULT_BUSINESS_SCHEDULE)[day] ?? DEFAULT_BUSINESS_SCHEDULE[day];
  if (!row.enabled) return false;
  const start = timeToMinutes(time);
  return start >= timeToMinutes(row.startTime) && start + duration <= timeToMinutes(row.endTime);
}

function hasOverlap(startA: string, durationA: number, startB: string, durationB: number): boolean {
  const startMinutesA = timeToMinutes(startA);
  const endMinutesA = startMinutesA + durationA;
  const startMinutesB = timeToMinutes(startB);
  const endMinutesB = startMinutesB + durationB;
  return startMinutesA < endMinutesB && startMinutesB < endMinutesA;
}

function hasBufferedConflict(startA: string, durationA: number, startB: string, durationB: number, bufferMinutes: number): boolean {
  const startMinutesA = timeToMinutes(startA);
  const startMinutesB = timeToMinutes(startB);

  if (startMinutesA <= startMinutesB) {
    return (startMinutesA + durationA + bufferMinutes) > startMinutesB;
  }

  return (startMinutesB + durationB + bufferMinutes) > startMinutesA;
}

function isBlockingStatus(status: string, availabilityMode: "duration_buffer" | "release_on_complete"): boolean {
  if (availabilityMode === "release_on_complete") {
    return status === "pending" || status === "confirmed";
  }

  return status !== "cancelled";
}

async function sendClientAppointmentPush(
  shop: string,
  clientId: string,
  title: string,
  body: string,
  appointmentId: string,
): Promise<void> {
  const recipients = await db.select({ token: usersTable.expoPushToken })
    .from(usersTable)
    .where(and(
      eq(usersTable.barbershopId, shop),
      eq(usersTable.clientId, clientId),
      isNotNull(usersTable.expoPushToken),
    ));
  const tokens = Array.from(new Set(recipients.map((recipient) => recipient.token).filter((token): token is string => !!token)));
  await sendExpoPush(tokens.map((to) => ({
    to,
    title,
    body,
    data: { type: "appointment.updated", appointmentId },
  })));
}

async function sendStaffAppointmentPush(
  shop: string,
  professionalId: string,
  title: string,
  body: string,
  appointmentId: string,
  type = "appointment.updated",
): Promise<void> {
  const recipients = await db.select({ token: usersTable.expoPushToken })
    .from(usersTable)
    .where(and(
      eq(usersTable.barbershopId, shop),
      isNotNull(usersTable.expoPushToken),
      or(
        eq(usersTable.role, "admin"),
        eq(usersTable.professionalId, professionalId),
      ),
    ));
  const tokens = Array.from(new Set(recipients.map((recipient) => recipient.token).filter((token): token is string => !!token)));
  await sendExpoPush(tokens.map((to) => ({
    to,
    title,
    body,
    data: { type, appointmentId },
  })));
}

router.patch("/appointments/:id", async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = AppointmentUpdate.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Dados invalidos" });
    return;
  }

  const shop = req.auth!.barbershop.id;
  const auth = req.auth!;
  const bufferMinutes = req.auth!.barbershop.bookingBufferMinutes ?? 0;
  const shopConfig = req.auth!.barbershop as { bookingAvailabilityMode?: string };
  const availabilityMode: "duration_buffer" | "release_on_complete" =
    shopConfig.bookingAvailabilityMode === "release_on_complete"
      ? "release_on_complete"
      : "duration_buffer";

  const [existing] = await db.select().from(appointmentsTable)
    .where(and(
      eq(appointmentsTable.id, id),
      eq(appointmentsTable.barbershopId, shop),
    ))
    .limit(1);
  if (!existing) {
    res.status(404).json({ error: "Agendamento nao encontrado." });
    return;
  }

  if (auth.user.role === "client") {
    if (existing.clientId !== auth.user.clientId) {
      res.status(403).json({ error: "Acesso negado." });
      return;
    }

    const wantsCancel = parsed.data.status === "cancelled";
    const wantsConfirm = parsed.data.status === "confirmed";
    const wantsReschedule = parsed.data.date !== undefined || parsed.data.time !== undefined;
    const wantsClientChange = wantsCancel || wantsReschedule;
    const invalidStatus = parsed.data.status !== undefined && parsed.data.status !== "cancelled" && parsed.data.status !== "confirmed";
    const touchesPayment = parsed.data.paymentMethod !== undefined;
    const touchesNotes = parsed.data.clientNotes !== undefined || parsed.data.professionalNotes !== undefined;

    if (invalidStatus || touchesPayment || touchesNotes || (wantsCancel && wantsReschedule) || (wantsConfirm && wantsReschedule)) {
      res.status(403).json({ error: "Cliente so pode confirmar, cancelar ou reagendar o proprio agendamento." });
      return;
    }

    if (wantsConfirm && existing.status !== "pending") {
      res.status(409).json({ error: "Somente agendamentos pendentes podem ser confirmados." });
      return;
    }

    if (wantsClientChange && (existing.status === "completed" || existing.status === "cancelled")) {
      res.status(409).json({ error: "Somente agendamentos ativos podem ser cancelados ou reagendados." });
      return;
    }

    if (wantsClientChange && isWithinClientChangeCutoff(existing.date, existing.time)) {
      res.status(409).json({ error: CLIENT_CHANGE_CUTOFF_ERROR });
      return;
    }
  }

  const nextDate = parsed.data.date ?? existing.date;
  const nextTime = parsed.data.time ?? existing.time;
  const isRescheduling = nextDate !== existing.date || nextTime !== existing.time;

  if (isRescheduling) {
    const nextDateTime = new Date(`${nextDate}T${nextTime}:00`);
    if (Number.isNaN(nextDateTime.getTime()) || nextDateTime.getTime() <= Date.now()) {
      res.status(400).json({ error: "Escolha um horario futuro para reagendar." });
      return;
    }

    const conflicts = await db.select().from(appointmentsTable).where(and(
      eq(appointmentsTable.barbershopId, shop),
      eq(appointmentsTable.date, nextDate),
      ne(appointmentsTable.id, id),
      or(
        eq(appointmentsTable.professionalId, existing.professionalId),
        eq(appointmentsTable.clientId, existing.clientId),
      ),
    ));
    const activeConflicts = conflicts.filter((apt) => isBlockingStatus(apt.status, availabilityMode));
    const professionalOverlap = activeConflicts.some((apt) =>
      apt.professionalId === existing.professionalId &&
      hasBufferedConflict(apt.time, apt.totalDuration, nextTime, existing.totalDuration, bufferMinutes));
    if (professionalOverlap) {
      res.status(409).json({ error: "Esse horario conflita com outro atendimento do profissional." });
      return;
    }
    const clientOverlap = activeConflicts.some((apt) =>
      apt.clientId === existing.clientId &&
      hasBufferedConflict(apt.time, apt.totalDuration, nextTime, existing.totalDuration, bufferMinutes));
    if (clientOverlap) {
      res.status(409).json({ error: "Voce ja possui outro agendamento nesse horario." });
      return;
    }
    const [profRow] = await db.select().from(professionalsTable)
      .where(and(eq(professionalsTable.id, existing.professionalId), eq(professionalsTable.barbershopId, shop)))
      .limit(1);
    if (!fitsSchedule((req.auth!.barbershop as { businessSchedule?: ScheduleRecord }).businessSchedule, nextDate, nextTime, existing.totalDuration)) {
      res.status(409).json({ error: "Horario fora do funcionamento do estabelecimento." });
      return;
    }
    if (profRow && !fitsSchedule(profRow.schedule as ScheduleRecord, nextDate, nextTime, existing.totalDuration)) {
      res.status(409).json({ error: "Horario fora da escala do profissional." });
      return;
    }
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;
  if (parsed.data.paymentMethod !== undefined) updates.paymentMethod = parsed.data.paymentMethod;
  if (parsed.data.date !== undefined) updates.date = parsed.data.date;
  if (parsed.data.time !== undefined) updates.time = parsed.data.time;
  if (auth.user.role !== "client" && parsed.data.clientNotes !== undefined) updates.clientNotes = parsed.data.clientNotes;
  if (auth.user.role !== "client" && parsed.data.professionalNotes !== undefined) updates.professionalNotes = parsed.data.professionalNotes;
  if (isRescheduling && updates.status === undefined) {
    updates.status = "confirmed";
  }

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
      const [fresh] = await db.select().from(appointmentsTable)
        .where(and(
          eq(appointmentsTable.id, id),
          eq(appointmentsTable.barbershopId, shop),
        ))
        .limit(1);
      const services = await db.select().from(appointmentServicesTable)
        .where(eq(appointmentServicesTable.appointmentId, id));
      res.json(serializeAppointment(fresh!, services));
      return;
    }

    updated = maybe;

    if (!existing.isFreeByLoyalty) {
      const serviceRows = await db.select().from(appointmentServicesTable)
        .where(eq(appointmentServicesTable.appointmentId, id));
      const serviceIds = serviceRows.map((service) => service.serviceId);
      await consumeClientPackageForAppointment(shop, existing.clientId, id, serviceIds);

      const cashAmount = parseFloat(updated.totalPrice);
      if (Number.isFinite(cashAmount) && cashAmount > 0 && updated.paymentMethod !== "Pacote") {
        await db.insert(categoriesTable).values({
          barbershopId: shop,
          type: "income",
          name: "Atendimentos",
        }).onConflictDoNothing();

        await db.insert(cashEntriesTable).values({
          barbershopId: shop,
          description: `Atendimento - ${updated.clientName}`,
          amount: cashAmount.toFixed(2),
          type: "income",
          category: "Atendimentos",
          paymentMethod: updated.paymentMethod ?? existing.paymentMethod ?? "Outro",
          date: updated.date,
          professionalId: updated.professionalId,
          professionalName: updated.professionalName,
        });
      }

      const [settings] = await db.select().from(loyaltySettingsTable)
        .where(eq(loyaltySettingsTable.barbershopId, shop))
        .limit(1);
      const cap = settings?.requiredPoints ?? 10;
      const [client] = await db.select().from(clientsTable)
        .where(and(
          eq(clientsTable.id, existing.clientId),
          eq(clientsTable.barbershopId, shop),
        ))
        .limit(1);

      if (client) {
        const pointRows = serviceIds.length > 0
          ? await db.select({ id: servicesTable.id, loyaltyPoints: servicesTable.loyaltyPoints })
            .from(servicesTable)
            .where(and(eq(servicesTable.barbershopId, shop), inArray(servicesTable.id, serviceIds)))
          : [];
        const pointsByService = new Map(pointRows.map((service) => [service.id, service.loyaltyPoints]));
        const earnedPoints = Math.max(0, serviceIds.reduce((sum, serviceId) => sum + (pointsByService.get(serviceId) ?? 1), 0));
        const newPoints = Math.min(client.loyaltyPoints + earnedPoints, cap);
        const today = toBusinessDateString();

        await db.update(clientsTable).set({
          loyaltyPoints: newPoints,
          lastVisit: today,
          appointmentsCount: client.appointmentsCount + 1,
          totalSpent: String(parseFloat(client.totalSpent) + (updated.paymentMethod === "Pacote" ? 0 : parseFloat(existing.totalPrice))),
        }).where(and(
          eq(clientsTable.id, client.id),
          eq(clientsTable.barbershopId, shop),
        ));

        await db.insert(loyaltyMovementsTable).values({
          barbershopId: shop,
          clientId: client.id,
          date: today,
          points: earnedPoints,
          description: "Atendimento concluido",
          type: "earned",
        });

        if (newPoints >= cap && planHasFeature(req.auth!.barbershop.plan, "notifications")) {
          void sendClientAppointmentPush(
            shop,
            client.id,
            "Beneficio liberado",
            `Voce atingiu ${cap} pontos e ja pode resgatar: ${settings?.benefitDescription ?? "beneficio de fidelidade"}.`,
            id,
          ).catch((err) => req.log.warn({ err, appointmentId: id }, "failed to dispatch loyalty push notification"));
        }
      }
    }
  } else {
    [updated] = await db.update(appointmentsTable)
      .set(updates)
      .where(and(
        eq(appointmentsTable.id, id),
        eq(appointmentsTable.barbershopId, shop),
      ))
      .returning();
  }

  const services = await db.select().from(appointmentServicesTable)
    .where(eq(appointmentServicesTable.appointmentId, id));
  if (planHasFeature(req.auth!.barbershop.plan, "notifications")) {
    const nextStatus = parsed.data.status;
    const notifyBodyDate = `${formatDateBR(updated.date)} as ${updated.time}`;
    let notify: { title: string; body: string } | null = null;
    if (isRescheduling) notify = { title: "Agendamento reagendado", body: `Seu atendimento agora esta marcado para ${notifyBodyDate}.` };
    else if (nextStatus === "cancelled") notify = { title: "Agendamento cancelado", body: `Seu atendimento de ${notifyBodyDate} foi cancelado.` };
    else if (nextStatus === "completed") notify = { title: "Atendimento concluido", body: "Obrigado pela visita. Seus pontos de fidelidade foram atualizados." };
    if (notify) {
      void sendClientAppointmentPush(shop, updated.clientId, notify.title, notify.body, updated.id)
        .catch((err) => req.log.warn({ err, appointmentId: updated.id }, "failed to dispatch appointment update push notification"));
    }

    if (auth.user.role === "client") {
      const serviceNames = services.map((service) => service.serviceName).join(" + ");
      let staffNotify: { title: string; body: string; type: string } | null = null;
      if (isRescheduling) {
        staffNotify = {
          title: "Agendamento reagendado",
          body: `${updated.clientName} reagendou ${serviceNames} com ${updated.professionalName} para ${notifyBodyDate}.`,
          type: "appointment.rescheduled",
        };
      } else if (nextStatus === "cancelled") {
        staffNotify = {
          title: "Agendamento cancelado",
          body: `${updated.clientName} cancelou ${serviceNames} de ${notifyBodyDate}.`,
          type: "appointment.cancelled",
        };
      } else if (nextStatus === "confirmed") {
        staffNotify = {
          title: "Presenca confirmada",
          body: `${updated.clientName} confirmou presenca em ${notifyBodyDate}.`,
          type: "appointment.confirmed",
        };
      }

      if (staffNotify) {
        void sendStaffAppointmentPush(shop, updated.professionalId, staffNotify.title, staffNotify.body, updated.id, staffNotify.type)
          .catch((err) => req.log.warn({ err, appointmentId: updated.id }, "failed to dispatch staff appointment update push notification"));
      }
    }
  }
  res.json(serializeAppointment(updated, services));
});

export default router;
