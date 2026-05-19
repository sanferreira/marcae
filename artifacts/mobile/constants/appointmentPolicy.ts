import type { Appointment } from "@/contexts/DataContext";

export const CLIENT_APPOINTMENT_CHANGE_CUTOFF_HOURS = 48;
export const CLIENT_APPOINTMENT_CHANGE_CUTOFF_DAYS = 2;

export const CLIENT_APPOINTMENT_CHANGE_POLICY_NOTICE =
  "Cancelamentos e reagendamentos pelo app podem ser feitos ate 2 dias antes do horario.";

export const CLIENT_APPOINTMENT_CHANGE_BLOCKED_NOTICE =
  "Este horario esta dentro do prazo de 2 dias. Para cancelar ou reagendar, fale com o estabelecimento.";

const CLIENT_APPOINTMENT_CHANGE_CUTOFF_MS =
  CLIENT_APPOINTMENT_CHANGE_CUTOFF_HOURS * 60 * 60 * 1000;

const ACTIVE_APPOINTMENT_STATUSES = new Set<Appointment["status"]>(["pending", "confirmed"]);

export function getAppointmentDateTime(date: string, time: string): Date | null {
  const scheduledAt = new Date(`${date}T${time}:00`);
  return Number.isNaN(scheduledAt.getTime()) ? null : scheduledAt;
}

export function canClientChangeAppointment(
  appointment: Pick<Appointment, "date" | "time" | "status">,
  now = new Date(),
): boolean {
  if (!ACTIVE_APPOINTMENT_STATUSES.has(appointment.status)) return false;

  const scheduledAt = getAppointmentDateTime(appointment.date, appointment.time);
  if (!scheduledAt) return false;

  return scheduledAt.getTime() - now.getTime() >= CLIENT_APPOINTMENT_CHANGE_CUTOFF_MS;
}
