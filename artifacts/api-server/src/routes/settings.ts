import { Router, type IRouter, type Request, type Response } from "express";
import { eq, inArray } from "drizzle-orm";
import {
  appointmentServicesTable,
  appointmentsTable,
  barbershopsTable,
  cashEntriesTable,
  categoriesTable,
  clientsTable,
  db,
  productOrderItemsTable,
  productOrdersTable,
  productsTable,
  professionalsTable,
  servicePackagesTable,
  clientPackagesTable,
  servicesTable,
} from "@workspace/db";
import { UpdateBarbershopSettingsBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { IntakeFieldSchema, ScheduleSchema } from "../lib/schemas";
import {
  computePlanStatus,
  serializeAppointment,
  serializeBarbershop,
  serializeCashEntry,
  serializeCategory,
  serializeClient,
  serializeClientPackage,
  serializeProduct,
  serializeProductOrder,
  serializeProfessional,
  serializeService,
  serializeServicePackage,
  slugify,
} from "../lib/serializers";

const router: IRouter = Router();

router.patch(["/barbershop", "/establishment"], requireAuth, async (req: Request, res: Response): Promise<void> => {
  if (req.auth!.user.role !== "admin") {
    res.status(403).json({ error: "Apenas o administrador pode alterar as configurações." });
    return;
  }
  const parsed = UpdateBarbershopSettingsBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." });
    return;
  }
  const patch: Record<string, unknown> = {};
  const d = parsed.data;
  if (typeof d.name === "string") patch.name = d.name.trim();
  if (d.phone !== undefined) patch.phone = d.phone;
  if (d.address !== undefined) patch.address = d.address;
  if (typeof d.brandPrimary === "string") patch.brandPrimary = d.brandPrimary.toUpperCase();
  if (typeof d.brandAccent === "string") patch.brandAccent = d.brandAccent.toUpperCase();
  if (typeof d.bookingBufferMinutes === "number") patch.bookingBufferMinutes = d.bookingBufferMinutes;
  const bookingAvailabilityMode = (d as typeof d & { bookingAvailabilityMode?: string }).bookingAvailabilityMode;
  if (typeof bookingAvailabilityMode === "string") patch.bookingAvailabilityMode = bookingAvailabilityMode;
  const businessSchedule = (d as typeof d & { businessSchedule?: unknown }).businessSchedule;
  if (businessSchedule !== undefined) {
    const schedule = ScheduleSchema.safeParse(businessSchedule);
    if (!schedule.success) {
      res.status(400).json({ error: "Horario do estabelecimento invalido." });
      return;
    }
    patch.businessSchedule = schedule.data;
  }
  const intakeFields = (d as typeof d & { intakeFields?: unknown }).intakeFields;
  if (intakeFields !== undefined) {
    const parsedFields = IntakeFieldSchema.array().max(12).safeParse(intakeFields);
    if (!parsedFields.success) {
      res.status(400).json({ error: "Campos da ficha invalidos." });
      return;
    }
    const seen = new Set<string>();
    patch.intakeFields = parsedFields.data
      .map((field, index) => ({
        ...field,
        key: slugify(field.key || field.label) || `campo_${index + 1}`,
        label: field.label.trim(),
      }))
      .filter((field) => {
        if (seen.has(field.key)) return false;
        seen.add(field.key);
        return true;
      });
  }
  if (Object.keys(patch).length === 0) {
    res.json({ ...serializeBarbershop(req.auth!.barbershop), planStatus: computePlanStatus(req.auth!.barbershop) });
    return;
  }
  const [updated] = await db.update(barbershopsTable)
    .set(patch)
    .where(eq(barbershopsTable.id, req.auth!.barbershop.id))
    .returning();
  res.json(serializeBarbershop(updated));
});

router.get(["/barbershop/export", "/establishment/export"], requireAuth, async (req: Request, res: Response): Promise<void> => {
  if (req.auth!.user.role !== "admin") {
    res.status(403).json({ error: "Apenas o administrador pode exportar os dados." });
    return;
  }
  const shop = req.auth!.barbershop.id;
  const [
    services,
    products,
    categories,
    professionals,
    clients,
    appointments,
    cashEntries,
    servicePackages,
    clientPackages,
    orders,
  ] = await Promise.all([
    db.select().from(servicesTable).where(eq(servicesTable.barbershopId, shop)),
    db.select().from(productsTable).where(eq(productsTable.barbershopId, shop)),
    db.select().from(categoriesTable).where(eq(categoriesTable.barbershopId, shop)),
    db.select().from(professionalsTable).where(eq(professionalsTable.barbershopId, shop)),
    db.select().from(clientsTable).where(eq(clientsTable.barbershopId, shop)),
    db.select().from(appointmentsTable).where(eq(appointmentsTable.barbershopId, shop)),
    db.select().from(cashEntriesTable).where(eq(cashEntriesTable.barbershopId, shop)),
    db.select().from(servicePackagesTable).where(eq(servicePackagesTable.barbershopId, shop)),
    db.select().from(clientPackagesTable).where(eq(clientPackagesTable.barbershopId, shop)),
    db.select().from(productOrdersTable).where(eq(productOrdersTable.barbershopId, shop)),
  ]);

  const appointmentIds = appointments.map((appointment) => appointment.id);
  const appointmentServices = appointmentIds.length > 0
    ? await db.select().from(appointmentServicesTable).where(inArray(appointmentServicesTable.appointmentId, appointmentIds))
    : [];
  const servicesByAppointment = new Map<string, typeof appointmentServices>();
  for (const service of appointmentServices) {
    const list = servicesByAppointment.get(service.appointmentId) ?? [];
    list.push(service);
    servicesByAppointment.set(service.appointmentId, list);
  }

  const orderIds = orders.map((order) => order.id);
  const orderItems = orderIds.length > 0
    ? await db.select().from(productOrderItemsTable).where(inArray(productOrderItemsTable.orderId, orderIds))
    : [];
  const itemsByOrder = new Map<string, typeof orderItems>();
  for (const item of orderItems) {
    const list = itemsByOrder.get(item.orderId) ?? [];
    list.push(item);
    itemsByOrder.set(item.orderId, list);
  }

  res.json({
    exportedAt: new Date().toISOString(),
    barbershop: serializeBarbershop(req.auth!.barbershop),
    services: services.map(serializeService),
    products: products.map(serializeProduct),
    categories: categories.map(serializeCategory),
    professionals: professionals.map((professional) => serializeProfessional(professional)),
    clients: clients.map(serializeClient),
    appointments: appointments.map((appointment) => serializeAppointment(appointment, servicesByAppointment.get(appointment.id) ?? [])),
    cashEntries: cashEntries.map(serializeCashEntry),
    servicePackages: servicePackages.map(serializeServicePackage),
    clientPackages: clientPackages.map(serializeClientPackage),
    productOrders: orders.map((order) => serializeProductOrder(order, itemsByOrder.get(order.id) ?? [])),
  });
});

export default router;
