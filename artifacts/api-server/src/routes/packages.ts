import { Router, type IRouter, type Request, type Response } from "express";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  categoriesTable,
  cashEntriesTable,
  clientPackageUsagesTable,
  clientPackagesTable,
  clientsTable,
  db,
  servicePackagesTable,
  servicesTable,
} from "@workspace/db";
import { requireAuth, requireRole } from "../lib/auth";
import { addBusinessDays, toBusinessDateString } from "../lib/dates";
import { ClientPackageCreate, ServicePackageCreate, ServicePackageUpdate } from "../lib/schemas";
import { serializeClientPackage, serializeServicePackage } from "../lib/serializers";

const router: IRouter = Router();
router.use(requireAuth);

function addDaysIso(days: number): string {
  return addBusinessDays(days);
}

router.get("/service-packages", async (req: Request, res: Response): Promise<void> => {
  const shop = req.auth!.barbershop.id;
  const rows = await db.select().from(servicePackagesTable)
    .where(eq(servicePackagesTable.barbershopId, shop))
    .orderBy(desc(servicePackagesTable.createdAt));
  res.json(rows.map(serializeServicePackage));
});

router.post("/service-packages", requireRole("admin"), async (req: Request, res: Response): Promise<void> => {
  const parsed = ServicePackageCreate.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Dados invalidos" }); return; }
  const shop = req.auth!.barbershop.id;
  if (parsed.data.serviceId) {
    const [service] = await db.select().from(servicesTable)
      .where(and(eq(servicesTable.id, parsed.data.serviceId), eq(servicesTable.barbershopId, shop)))
      .limit(1);
    if (!service) { res.status(400).json({ error: "Servico invalido para este estabelecimento." }); return; }
  }
  const [row] = await db.insert(servicePackagesTable).values({
    barbershopId: shop,
    serviceId: parsed.data.serviceId ?? null,
    name: parsed.data.name,
    description: parsed.data.description,
    sessionsTotal: parsed.data.sessionsTotal,
    price: String(parsed.data.price),
    validityDays: parsed.data.validityDays,
    isActive: parsed.data.isActive,
  }).returning();

  await db.insert(categoriesTable).values({ barbershopId: shop, type: "income", name: "Pacotes" }).onConflictDoNothing();
  res.status(201).json(serializeServicePackage(row));
});

router.patch("/service-packages/:id", requireRole("admin"), async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = ServicePackageUpdate.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Dados invalidos" }); return; }
  const shop = req.auth!.barbershop.id;
  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;
  if (parsed.data.serviceId !== undefined) updates.serviceId = parsed.data.serviceId ?? null;
  if (parsed.data.sessionsTotal !== undefined) updates.sessionsTotal = parsed.data.sessionsTotal;
  if (parsed.data.price !== undefined) updates.price = String(parsed.data.price);
  if (parsed.data.validityDays !== undefined) updates.validityDays = parsed.data.validityDays;
  if (parsed.data.isActive !== undefined) updates.isActive = parsed.data.isActive;

  const [row] = await db.update(servicePackagesTable).set(updates)
    .where(and(eq(servicePackagesTable.id, id), eq(servicePackagesTable.barbershopId, shop)))
    .returning();
  if (!row) { res.status(404).json({ error: "Pacote nao encontrado." }); return; }
  res.json(serializeServicePackage(row));
});

router.get("/client-packages", async (req: Request, res: Response): Promise<void> => {
  const shop = req.auth!.barbershop.id;
  const auth = req.auth!;
  const rows = await db.select().from(clientPackagesTable)
    .where(auth.user.role === "client" && auth.user.clientId
      ? and(eq(clientPackagesTable.barbershopId, shop), eq(clientPackagesTable.clientId, auth.user.clientId))
      : eq(clientPackagesTable.barbershopId, shop))
    .orderBy(desc(clientPackagesTable.createdAt));
  res.json(rows.map(serializeClientPackage));
});

router.get("/clients/:id/packages", async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const shop = req.auth!.barbershop.id;
  if (req.auth!.user.role === "client" && req.auth!.user.clientId !== id) {
    res.status(403).json({ error: "Acesso negado." });
    return;
  }
  const rows = await db.select().from(clientPackagesTable)
    .where(and(eq(clientPackagesTable.barbershopId, shop), eq(clientPackagesTable.clientId, id)))
    .orderBy(desc(clientPackagesTable.createdAt));
  res.json(rows.map(serializeClientPackage));
});

router.post("/client-packages", requireRole("admin", "employee"), async (req: Request, res: Response): Promise<void> => {
  const parsed = ClientPackageCreate.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Dados invalidos" }); return; }
  const shop = req.auth!.barbershop.id;
  const [client] = await db.select().from(clientsTable)
    .where(and(eq(clientsTable.id, parsed.data.clientId), eq(clientsTable.barbershopId, shop)))
    .limit(1);
  if (!client) { res.status(404).json({ error: "Cliente nao encontrado." }); return; }

  const [pkg] = await db.select().from(servicePackagesTable)
    .where(and(eq(servicePackagesTable.id, parsed.data.packageId), eq(servicePackagesTable.barbershopId, shop)))
    .limit(1);
  if (!pkg) { res.status(404).json({ error: "Pacote nao encontrado." }); return; }
  if (!pkg.isActive) { res.status(409).json({ error: "Pacote inativo." }); return; }

  let serviceName = "Qualquer servico";
  if (pkg.serviceId) {
    const [service] = await db.select().from(servicesTable)
      .where(and(eq(servicesTable.id, pkg.serviceId), eq(servicesTable.barbershopId, shop)))
      .limit(1);
    serviceName = service?.name ?? serviceName;
  }

  const [row] = await db.insert(clientPackagesTable).values({
    barbershopId: shop,
    clientId: client.id,
    packageId: pkg.id,
    serviceId: pkg.serviceId,
    packageName: pkg.name,
    serviceName,
    sessionsTotal: pkg.sessionsTotal,
    pricePaid: String(parsed.data.pricePaid ?? parseFloat(pkg.price)),
    expiresAt: addDaysIso(pkg.validityDays),
    status: "active",
  }).returning();

  const paid = parsed.data.pricePaid ?? parseFloat(pkg.price);
  if (paid > 0) {
    const today = toBusinessDateString();
    await db.insert(categoriesTable).values({ barbershopId: shop, type: "income", name: "Pacotes" }).onConflictDoNothing();
    await db.insert(cashEntriesTable).values({
      barbershopId: shop,
      description: `Venda de pacote - ${client.name}`,
      amount: paid.toFixed(2),
      type: "income",
      category: "Pacotes",
      paymentMethod: "Manual",
      date: today,
    });
    await db.update(clientsTable).set({
      totalSpent: (parseFloat(client.totalSpent) + paid).toFixed(2),
    }).where(and(eq(clientsTable.id, client.id), eq(clientsTable.barbershopId, shop)));
  }

  res.status(201).json(serializeClientPackage(row));
});

router.patch("/client-packages/:id/cancel", requireRole("admin", "employee"), async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const shop = req.auth!.barbershop.id;
  const [row] = await db.update(clientPackagesTable).set({ status: "cancelled" })
    .where(and(eq(clientPackagesTable.id, id), eq(clientPackagesTable.barbershopId, shop)))
    .returning();
  if (!row) { res.status(404).json({ error: "Pacote do cliente nao encontrado." }); return; }
  res.json(serializeClientPackage(row));
});

export async function consumeClientPackageForAppointment(
  shop: string,
  clientId: string,
  appointmentId: string,
  serviceIds: string[],
): Promise<void> {
  if (serviceIds.length === 0) return;
  const packages = await db.select().from(clientPackagesTable)
    .where(and(
      eq(clientPackagesTable.barbershopId, shop),
      eq(clientPackagesTable.clientId, clientId),
      eq(clientPackagesTable.status, "active"),
    ))
    .orderBy(clientPackagesTable.expiresAt);

  const today = toBusinessDateString();
  const eligible = packages.find((pkg) =>
    pkg.sessionsUsed < pkg.sessionsTotal &&
    (!pkg.expiresAt || pkg.expiresAt >= today) &&
    (!pkg.serviceId || serviceIds.includes(pkg.serviceId)));
  if (!eligible) return;

  const nextUsed = eligible.sessionsUsed + 1;
  await db.update(clientPackagesTable)
    .set({
      sessionsUsed: sql`${clientPackagesTable.sessionsUsed} + 1`,
      status: nextUsed >= eligible.sessionsTotal ? "used" : "active",
    })
    .where(eq(clientPackagesTable.id, eligible.id));
  await db.insert(clientPackageUsagesTable).values({
    clientPackageId: eligible.id,
    appointmentId,
  });
}

export default router;
