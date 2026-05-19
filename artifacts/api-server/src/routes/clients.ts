import { Router, type IRouter, type Request, type Response } from "express";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db, clientsTable, loyaltyMovementsTable, loyaltySettingsTable, productOrdersTable, type Client } from "@workspace/db";
import { requireAuth, requireRole } from "../lib/auth";
import { ClientCreate, ClientUpdate, LoyaltyAdjust, LoyaltySettingsUpdate } from "../lib/schemas";
import { serializeClient, serializeLoyaltyMovement, serializeLoyaltySettings } from "../lib/serializers";

const router: IRouter = Router();
router.use(requireAuth);

function serializeClientWithProductOrders(client: Client, productOrdersSpent: number) {
  const serialized = serializeClient(client);
  const totalSpent = serialized.totalSpent + productOrdersSpent;
  return {
    ...serialized,
    totalSpent: Number(totalSpent.toFixed(2)),
    productOrdersSpent: Number(productOrdersSpent.toFixed(2)),
  };
}

async function productOrderTotalsByClient(shop: string) {
  const rows = await db
    .select({
      clientId: productOrdersTable.clientId,
      total: sql<string>`coalesce(sum(${productOrdersTable.totalPrice}), 0)`,
    })
    .from(productOrdersTable)
    .where(and(
      eq(productOrdersTable.barbershopId, shop),
      inArray(productOrdersTable.status, ["paid", "delivered"]),
    ))
    .groupBy(productOrdersTable.clientId);

  return new Map(rows.map((row) => [row.clientId, Number(row.total) || 0]));
}

// Clients can only see their own row; admins/employees see all in tenant.
router.get("/clients", async (req: Request, res: Response): Promise<void> => {
  const shop = req.auth!.barbershop.id;
  const auth = req.auth!;
  const orderTotals = await productOrderTotalsByClient(shop);
  if (auth.user.role === "client") {
    if (!auth.user.clientId) { res.json([]); return; }
    const rows = await db.select().from(clientsTable)
      .where(and(eq(clientsTable.barbershopId, shop), eq(clientsTable.id, auth.user.clientId)));
    res.json(rows.map((client) => serializeClientWithProductOrders(client, orderTotals.get(client.id) ?? 0)));
    return;
  }
  const rows = await db.select().from(clientsTable).where(eq(clientsTable.barbershopId, shop));
  res.json(rows.map((client) => serializeClientWithProductOrders(client, orderTotals.get(client.id) ?? 0)));
});

function csvEscape(value: unknown): string {
  const raw = value == null ? "" : String(value);
  if (!/[",\n\r]/.test(raw)) return raw;
  return `"${raw.replace(/"/g, '""')}"`;
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        current += ch;
      }
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ",") { cells.push(current); current = ""; }
    else current += ch;
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function parseClientsCsv(csv: string) {
  const lines = csv.replace(/\r/g, "").split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  const header = parseCsvLine(lines[0]).map((cell) => cell.trim().toLowerCase());
  const fallbackHeader = ["name", "phone", "email", "birthdate", "notes", "allergies", "restrictions", "preferences", "emergencycontact"];
  const knownColumns = new Set([...fallbackHeader, "nome", "telefone", "birth_date", "nascimento", "observacoes", "alergias", "restricoes", "preferencias", "emergency_contact", "contato_emergencia", "totalspent", "total_spent", "productordersspent", "product_orders_spent"]);
  const hasNamedHeader = header.includes("name") || header.includes("nome");
  const columns = hasNamedHeader ? header : fallbackHeader;
  const dataLines = hasNamedHeader ? lines.slice(1) : lines;
  return dataLines.map((line) => {
    const values = parseCsvLine(line);
    const row = new Map<string, string>();
    columns.forEach((column, index) => row.set(column, values[index] ?? ""));
    return {
      name: row.get("name") || row.get("nome") || "",
      phone: row.get("phone") || row.get("telefone") || "",
      email: row.get("email") || "",
      birthDate: row.get("birthdate") || row.get("birth_date") || row.get("nascimento") || "",
      notes: row.get("notes") || row.get("observacoes") || "",
      allergies: row.get("allergies") || row.get("alergias") || "",
      restrictions: row.get("restrictions") || row.get("restricoes") || "",
      preferences: row.get("preferences") || row.get("preferencias") || "",
      emergencyContact: row.get("emergencycontact") || row.get("emergency_contact") || row.get("contato_emergencia") || "",
      intakeData: Object.fromEntries(
        columns
          .filter((column) => !knownColumns.has(column))
          .map((column) => [column, row.get(column) ?? ""])
          .filter(([, value]) => value.trim()),
      ),
    };
  }).filter((row) => row.name.trim());
}

router.get("/clients/export", requireRole("admin", "employee"), async (req: Request, res: Response): Promise<void> => {
  const shop = req.auth!.barbershop.id;
  const rows = await db.select().from(clientsTable).where(eq(clientsTable.barbershopId, shop));
  const orderTotals = await productOrderTotalsByClient(shop);
  const intakeKeys = Array.from(new Set(rows.flatMap((client) => Object.keys(serializeClientWithProductOrders(client, orderTotals.get(client.id) ?? 0).intakeData ?? {}))));
  const header = ["name", "phone", "email", "totalSpent", "productOrdersSpent", "birthDate", "notes", "allergies", "restrictions", "preferences", "emergencyContact", ...intakeKeys];
  const csv = [
    header.join(","),
    ...rows.map((client) => {
      const serialized = serializeClientWithProductOrders(client, orderTotals.get(client.id) ?? 0) as Record<string, unknown>;
      const intakeData = serialized.intakeData as Record<string, unknown>;
      return header.map((key) => csvEscape(serialized[key] ?? intakeData?.[key])).join(",");
    }),
  ].join("\n");
  res.json({ filename: `clientes-${req.auth!.barbershop.slug}.csv`, csv });
});

router.post("/clients/import", requireRole("admin", "employee"), async (req: Request, res: Response): Promise<void> => {
  const csv = typeof req.body?.csv === "string" ? req.body.csv : "";
  if (!csv.trim()) { res.status(400).json({ error: "CSV vazio." }); return; }
  const rows = parseClientsCsv(csv).slice(0, 1000);
  const shop = req.auth!.barbershop.id;
  const existing = await db.select().from(clientsTable).where(eq(clientsTable.barbershopId, shop));
  const seenEmails = new Set(existing.map((client) => client.email.trim().toLowerCase()).filter(Boolean));
  const seenPhones = new Set(existing.map((client) => client.phone.trim()).filter(Boolean));
  let created = 0;
  let skipped = 0;

  for (const row of rows) {
    const email = row.email.trim().toLowerCase();
    const phone = row.phone.trim();
    if ((email && seenEmails.has(email)) || (phone && seenPhones.has(phone))) {
      skipped += 1;
      continue;
    }
    await db.insert(clientsTable).values({
      barbershopId: shop,
      name: row.name.trim(),
      phone,
      email,
      birthDate: row.birthDate || null,
      notes: row.notes || null,
      allergies: row.allergies,
      restrictions: row.restrictions,
      preferences: row.preferences,
      emergencyContact: row.emergencyContact,
      intakeData: row.intakeData,
    });
    if (email) seenEmails.add(email);
    if (phone) seenPhones.add(phone);
    created += 1;
  }

  res.status(201).json({ created, skipped });
});

router.post("/clients", requireRole("admin", "employee"), async (req: Request, res: Response): Promise<void> => {
  const parsed = ClientCreate.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }); return; }
  const shop = req.auth!.barbershop.id;
  const [row] = await db.insert(clientsTable).values({
    barbershopId: shop,
    name: parsed.data.name,
    phone: parsed.data.phone,
    email: parsed.data.email,
    birthDate: parsed.data.birthDate ?? null,
    notes: parsed.data.notes ?? null,
    allergies: parsed.data.allergies,
    restrictions: parsed.data.restrictions,
    preferences: parsed.data.preferences,
    emergencyContact: parsed.data.emergencyContact,
    intakeData: parsed.data.intakeData,
  }).returning();
  res.status(201).json(serializeClientWithProductOrders(row, 0));
});

router.patch("/clients/:id", async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = ClientUpdate.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Dados invalidos" }); return; }
  const shop = req.auth!.barbershop.id;
  const auth = req.auth!;
  if (auth.user.role === "client" && auth.user.clientId !== id) {
    res.status(403).json({ error: "Acesso negado." });
    return;
  }
  const updates: Record<string, unknown> = {};
  const data = parsed.data;
  if (data.name !== undefined) updates.name = data.name.trim();
  if (data.phone !== undefined) updates.phone = data.phone.trim();
  if (data.email !== undefined) updates.email = data.email.trim().toLowerCase();
  if (data.birthDate !== undefined) updates.birthDate = data.birthDate || null;
  if (data.notes !== undefined) updates.notes = data.notes || null;
  if (data.allergies !== undefined) updates.allergies = data.allergies;
  if (data.restrictions !== undefined) updates.restrictions = data.restrictions;
  if (data.preferences !== undefined) updates.preferences = data.preferences;
  if (data.emergencyContact !== undefined) updates.emergencyContact = data.emergencyContact;
  if (data.intakeData !== undefined) updates.intakeData = data.intakeData;
  const [row] = await db.update(clientsTable).set(updates)
    .where(and(eq(clientsTable.id, id), eq(clientsTable.barbershopId, shop)))
    .returning();
  if (!row) { res.status(404).json({ error: "Cliente nao encontrado." }); return; }
  const orderTotals = await productOrderTotalsByClient(shop);
  res.json(serializeClientWithProductOrders(row, orderTotals.get(row.id) ?? 0));
});

router.get("/clients/:id/loyalty", async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const shop = req.auth!.barbershop.id;
  const auth = req.auth!;
  // Clients can only fetch their own loyalty
  if (auth.user.role === "client" && auth.user.clientId !== id) {
    res.status(403).json({ error: "Acesso negado." });
    return;
  }
  const [client] = await db.select().from(clientsTable)
    .where(and(eq(clientsTable.id, id), eq(clientsTable.barbershopId, shop))).limit(1);
  if (!client) { res.status(404).json({ error: "Cliente não encontrado." }); return; }
  const [settings] = await db.select().from(loyaltySettingsTable)
    .where(eq(loyaltySettingsTable.barbershopId, shop)).limit(1);
  const history = await db.select().from(loyaltyMovementsTable)
    .where(and(eq(loyaltyMovementsTable.barbershopId, shop), eq(loyaltyMovementsTable.clientId, id)))
    .orderBy(desc(loyaltyMovementsTable.createdAt));
  res.json({
    currentPoints: client.loyaltyPoints,
    requiredPoints: settings?.requiredPoints ?? 10,
    benefitDescription: settings?.benefitDescription ?? "Atendimento gratuito",
    history: history.map(serializeLoyaltyMovement),
  });
});

router.post("/clients/:id/loyalty/adjust", requireRole("admin"), async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = LoyaltyAdjust.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }); return; }
  const shop = req.auth!.barbershop.id;
  const [client] = await db.select().from(clientsTable)
    .where(and(eq(clientsTable.id, id), eq(clientsTable.barbershopId, shop))).limit(1);
  if (!client) { res.status(404).json({ error: "Cliente não encontrado." }); return; }
  const [settings] = await db.select().from(loyaltySettingsTable)
    .where(eq(loyaltySettingsTable.barbershopId, shop)).limit(1);
  const cap = settings?.requiredPoints ?? 10;
  const newPts = Math.max(0, Math.min(client.loyaltyPoints + parsed.data.points, cap));
  await db.update(clientsTable).set({ loyaltyPoints: newPts })
    .where(and(eq(clientsTable.id, id), eq(clientsTable.barbershopId, shop)));
  const today = new Date().toISOString().split("T")[0];
  await db.insert(loyaltyMovementsTable).values({
    barbershopId: shop,
    clientId: id,
    date: today,
    points: Math.abs(parsed.data.points),
    description: parsed.data.description,
    type: parsed.data.points >= 0 ? "adjusted" : "redeemed",
  });
  res.json({
    currentPoints: newPts,
    requiredPoints: cap,
    benefitDescription: settings?.benefitDescription ?? "Atendimento gratuito",
  });
});

router.get("/loyalty/settings", async (req: Request, res: Response): Promise<void> => {
  const shop = req.auth!.barbershop.id;
  let [s] = await db.select().from(loyaltySettingsTable)
    .where(eq(loyaltySettingsTable.barbershopId, shop)).limit(1);
  if (!s) {
    [s] = await db.insert(loyaltySettingsTable).values({ barbershopId: shop }).returning();
  }
  res.json(serializeLoyaltySettings(s));
});

router.patch("/loyalty/settings", requireRole("admin"), async (req: Request, res: Response): Promise<void> => {
  const parsed = LoyaltySettingsUpdate.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }); return; }
  const shop = req.auth!.barbershop.id;
  await db.insert(loyaltySettingsTable).values({
    barbershopId: shop,
    requiredPoints: parsed.data.requiredPoints,
    benefitDescription: parsed.data.benefitDescription,
  }).onConflictDoUpdate({
    target: loyaltySettingsTable.barbershopId,
    set: { requiredPoints: parsed.data.requiredPoints, benefitDescription: parsed.data.benefitDescription },
  });
  const [s] = await db.select().from(loyaltySettingsTable)
    .where(eq(loyaltySettingsTable.barbershopId, shop)).limit(1);
  res.json(serializeLoyaltySettings(s!));
});

export default router;
