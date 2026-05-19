import { and, eq, gte, inArray, isNotNull, isNull, lte, or } from "drizzle-orm";
import {
  appointmentsTable,
  barbershopsTable,
  db,
  usersTable,
  type Appointment,
  type Barbershop,
} from "@workspace/db";
import { logger } from "./logger";
import { planHasFeature } from "./plans";
import { sendExpoPush } from "./push";

const CHECK_EVERY_MS = 5 * 60 * 1000;
const ONE_DAY_WINDOW_MIN = { min: 23 * 60, max: 25 * 60 };
const TWO_HOUR_WINDOW_MIN = { min: 90, max: 150 };

let timer: NodeJS.Timeout | null = null;
let running = false;

function localDate(date = new Date()): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().split("T")[0];
}

function minutesUntilAppointment(appointment: Appointment, now = new Date()): number | null {
  const startsAt = new Date(`${appointment.date}T${appointment.time}:00`);
  if (Number.isNaN(startsAt.getTime())) return null;
  return Math.round((startsAt.getTime() - now.getTime()) / 60000);
}

function reminderKind(appointment: Appointment, now = new Date()): "24h" | "2h" | null {
  const minutes = minutesUntilAppointment(appointment, now);
  if (minutes == null || minutes <= 0) return null;
  const sent24h = !!(appointment as Appointment & { reminder24hSentAt?: Date | null }).reminder24hSentAt;
  const sent2h = !!(appointment as Appointment & { reminder2hSentAt?: Date | null }).reminder2hSentAt;

  if (!sent24h && minutes >= ONE_DAY_WINDOW_MIN.min && minutes <= ONE_DAY_WINDOW_MIN.max) return "24h";
  if (!sent2h && minutes >= TWO_HOUR_WINDOW_MIN.min && minutes <= TWO_HOUR_WINDOW_MIN.max) return "2h";
  return null;
}

async function sendReminder(appointment: Appointment, shop: Barbershop, kind: "24h" | "2h"): Promise<void> {
  if (!planHasFeature(shop.plan, "notifications")) return;

  const recipients = await db.select({ token: usersTable.expoPushToken })
    .from(usersTable)
    .where(and(
      eq(usersTable.barbershopId, appointment.barbershopId),
      isNotNull(usersTable.expoPushToken),
      or(
        eq(usersTable.clientId, appointment.clientId),
        eq(usersTable.professionalId, appointment.professionalId),
      ),
    ));

  const tokens = Array.from(new Set(recipients.map((row) => row.token).filter((token): token is string => !!token)));
  if (tokens.length === 0) return;

  const dateLabel = new Date(`${appointment.date}T12:00:00`).toLocaleDateString("pt-BR");
  const lead = kind === "24h" ? "amanha" : "em cerca de 2 horas";
  await sendExpoPush(tokens.map((to) => ({
    to,
    title: "Lembrete de agendamento",
    body: `Atendimento de ${appointment.clientName} com ${appointment.professionalName} ${lead}, em ${dateLabel} as ${appointment.time}.`,
    data: { type: "appointment.reminder", appointmentId: appointment.id, reminder: kind },
  })));
}

export async function dispatchDueAppointmentReminders(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const today = localDate();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = localDate(tomorrow);

    const appointments = await db.select().from(appointmentsTable)
      .where(and(
        gte(appointmentsTable.date, today),
        lte(appointmentsTable.date, tomorrowStr),
        or(eq(appointmentsTable.status, "pending"), eq(appointmentsTable.status, "confirmed")),
        or(isNull(appointmentsTable.reminder24hSentAt), isNull(appointmentsTable.reminder2hSentAt)),
      ));

    const shopIds = Array.from(new Set(appointments.map((appointment) => appointment.barbershopId)));
    if (shopIds.length === 0) return;

    const shops = await db.select().from(barbershopsTable).where(inArray(barbershopsTable.id, shopIds));
    const shopById = new Map(shops.map((shop) => [shop.id, shop]));
    const now = new Date();

    for (const appointment of appointments) {
      const kind = reminderKind(appointment, now);
      if (!kind) continue;
      const shop = shopById.get(appointment.barbershopId);
      if (!shop) continue;

      await sendReminder(appointment, shop, kind);
      await db.update(appointmentsTable)
        .set(kind === "24h" ? { reminder24hSentAt: new Date() } : { reminder2hSentAt: new Date() })
        .where(eq(appointmentsTable.id, appointment.id));
    }
  } catch (err) {
    logger.warn({ err }, "appointment reminder dispatch failed");
  } finally {
    running = false;
  }
}

export function startAppointmentReminderWorker(): void {
  if (timer) return;
  void dispatchDueAppointmentReminders();
  timer = setInterval(() => { void dispatchDueAppointmentReminders(); }, CHECK_EVERY_MS);
  timer.unref?.();
}
