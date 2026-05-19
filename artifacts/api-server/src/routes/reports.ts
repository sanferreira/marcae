import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq, gte, inArray, lte } from "drizzle-orm";
import {
  appointmentServicesTable,
  appointmentsTable,
  cashEntriesTable,
  db,
  professionalsTable,
} from "@workspace/db";
import { requireAuth, requireRole } from "../lib/auth";
import { requirePlanFeature } from "../lib/billing";

const router: IRouter = Router();
router.use(requireAuth);

function dateRange(req: Request) {
  const today = new Date().toISOString().split("T")[0];
  const monthStart = `${today.slice(0, 7)}-01`;
  const from = typeof req.query.from === "string" && /^\d{4}-\d{2}-\d{2}$/.test(req.query.from) ? req.query.from : monthStart;
  const to = typeof req.query.to === "string" && /^\d{4}-\d{2}-\d{2}$/.test(req.query.to) ? req.query.to : today;
  return { from, to };
}

function parseMoney(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : parseFloat(value);
}

router.get(
  "/reports/overview",
  requireRole("admin"),
  requirePlanFeature("reports"),
  async (req: Request, res: Response): Promise<void> => {
    const shop = req.auth!.barbershop.id;
    const { from, to } = dateRange(req);

    const [appointments, entries, professionals] = await Promise.all([
      db.select().from(appointmentsTable).where(and(
        eq(appointmentsTable.barbershopId, shop),
        gte(appointmentsTable.date, from),
        lte(appointmentsTable.date, to),
      )),
      db.select().from(cashEntriesTable).where(and(
        eq(cashEntriesTable.barbershopId, shop),
        gte(cashEntriesTable.date, from),
        lte(cashEntriesTable.date, to),
      )),
      db.select().from(professionalsTable).where(eq(professionalsTable.barbershopId, shop)),
    ]);

    const appointmentIds = appointments.map((appointment) => appointment.id);
    const services = appointmentIds.length > 0
      ? await db.select().from(appointmentServicesTable)
        .where(inArray(appointmentServicesTable.appointmentId, appointmentIds))
      : [];

    const completed = appointments.filter((appointment) => appointment.status === "completed");
    const revenue = entries.filter((entry) => entry.type === "income").reduce((sum, entry) => sum + parseMoney(entry.amount), 0);
    const expenses = entries.filter((entry) => entry.type === "expense").reduce((sum, entry) => sum + parseMoney(entry.amount), 0);

    const serviceCounts = new Map<string, { name: string; count: number; revenue: number }>();
    const completedIds = new Set(completed.map((appointment) => appointment.id));
    for (const service of services) {
      if (!completedIds.has(service.appointmentId)) continue;
      const current = serviceCounts.get(service.serviceName) ?? { name: service.serviceName, count: 0, revenue: 0 };
      current.count += 1;
      current.revenue += parseMoney(service.servicePrice);
      serviceCounts.set(service.serviceName, current);
    }

    const byProfessional = professionals.map((professional) => {
      const profAppointments = appointments.filter((appointment) => appointment.professionalId === professional.id);
      const profCompleted = profAppointments.filter((appointment) => appointment.status === "completed");
      const profRevenue = profCompleted.reduce((sum, appointment) => sum + parseMoney(appointment.totalPrice), 0);
      const workedMinutes = profCompleted.reduce((sum, appointment) => sum + appointment.totalDuration, 0);
      const scheduledMinutes = Math.max(1, profAppointments
        .filter((appointment) => appointment.status !== "cancelled")
        .reduce((sum, appointment) => sum + appointment.totalDuration, 0));
      return {
        id: professional.id,
        name: professional.name,
        completed: profCompleted.length,
        revenue: profRevenue,
        commissionRate: professional.commissionRate,
        commission: Math.round(profRevenue * (professional.commissionRate / 100)),
        occupancyPct: Math.round((workedMinutes / scheduledMinutes) * 100),
      };
    }).sort((a, b) => b.revenue - a.revenue);

    res.json({
      from,
      to,
      revenue,
      expenses,
      profit: revenue - expenses,
      appointments: appointments.length,
      completed: completed.length,
      cancelled: appointments.filter((appointment) => appointment.status === "cancelled").length,
      topServices: Array.from(serviceCounts.values()).sort((a, b) => b.count - a.count).slice(0, 10),
      byProfessional,
    });
  },
);

export default router;
