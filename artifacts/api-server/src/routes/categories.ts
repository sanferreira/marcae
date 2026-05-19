import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq } from "drizzle-orm";
import { cashEntriesTable, categoriesTable, db, productsTable, servicesTable } from "@workspace/db";
import { requireAuth, requireRole } from "../lib/auth";
import { CategoryCreate } from "../lib/schemas";
import { serializeCategory } from "../lib/serializers";

const router: IRouter = Router();
router.use(requireAuth);

const CATEGORY_TYPES = ["service", "product", "income", "expense"] as const;
const DEFAULT_INCOME_CATEGORIES = ["Atendimentos", "Produtos", "Outros"];
const DEFAULT_EXPENSE_CATEGORIES = ["Aluguel", "Produtos", "Salários", "Marketing", "Impostos", "Outros"];
const normalizeCategory = (value: string) => value.trim().replace(/\s+/g, " ");

async function ensureExistingCategories(shop: string): Promise<void> {
  const [services, products, cashEntries] = await Promise.all([
    db.select({ category: servicesTable.category }).from(servicesTable).where(eq(servicesTable.barbershopId, shop)),
    db.select({ category: productsTable.category }).from(productsTable).where(eq(productsTable.barbershopId, shop)),
    db.select({ category: cashEntriesTable.category, type: cashEntriesTable.type }).from(cashEntriesTable)
      .where(eq(cashEntriesTable.barbershopId, shop)),
  ]);

  const values: Array<{ barbershopId: string; type: string; name: string }> = [
    { barbershopId: shop, type: "service", name: "Geral" },
    { barbershopId: shop, type: "product", name: "Geral" },
    ...DEFAULT_INCOME_CATEGORIES.map((name) => ({ barbershopId: shop, type: "income", name })),
    ...DEFAULT_EXPENSE_CATEGORIES.map((name) => ({ barbershopId: shop, type: "expense", name })),
    ...services.map((service) => ({ barbershopId: shop, type: "service", name: service.category })),
    ...products.map((product) => ({ barbershopId: shop, type: "product", name: product.category })),
    ...cashEntries
      .filter((entry) => entry.type === "income" || entry.type === "expense")
      .map((entry) => ({ barbershopId: shop, type: entry.type, name: entry.category })),
  ].map((item) => ({ ...item, name: normalizeCategory(item.name) }))
    .filter((item) => item.name);

  const unique = new Map<string, { barbershopId: string; type: string; name: string }>();
  for (const value of values) unique.set(`${value.type}:${value.name}`, value);
  const rows = Array.from(unique.values());
  if (rows.length > 0) {
    await db.insert(categoriesTable).values(rows).onConflictDoNothing();
  }
}

router.get("/categories", async (req: Request, res: Response): Promise<void> => {
  const shop = req.auth!.barbershop.id;
  await ensureExistingCategories(shop);
  const rawType = typeof req.query.type === "string" ? req.query.type : null;
  const type = rawType && CATEGORY_TYPES.includes(rawType as typeof CATEGORY_TYPES[number])
    ? rawType
    : null;
  const rows = await db.select().from(categoriesTable)
    .where(type ? and(eq(categoriesTable.barbershopId, shop), eq(categoriesTable.type, type)) : eq(categoriesTable.barbershopId, shop));
  res.json(rows.map(serializeCategory));
});

router.post("/categories", requireRole("admin"), async (req: Request, res: Response): Promise<void> => {
  const parsed = CategoryCreate.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Dados invalidos" });
    return;
  }

  const shop = req.auth!.barbershop.id;
  const name = normalizeCategory(parsed.data.name);
  const [existing] = await db.select().from(categoriesTable)
    .where(and(
      eq(categoriesTable.barbershopId, shop),
      eq(categoriesTable.type, parsed.data.type),
      eq(categoriesTable.name, name),
    ))
    .limit(1);
  if (existing) {
    res.json(serializeCategory(existing));
    return;
  }

  const [row] = await db.insert(categoriesTable).values({
    barbershopId: shop,
    type: parsed.data.type,
    name,
  }).returning();
  res.status(201).json(serializeCategory(row));
});

router.delete("/categories/:id", requireRole("admin"), async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const shop = req.auth!.barbershop.id;
  const [category] = await db.select().from(categoriesTable)
    .where(and(eq(categoriesTable.id, id), eq(categoriesTable.barbershopId, shop)))
    .limit(1);

  if (!category) {
    res.status(404).json({ error: "Categoria nao encontrada." });
    return;
  }

  if (category.type === "service") {
    const [service] = await db.select().from(servicesTable)
      .where(and(eq(servicesTable.barbershopId, shop), eq(servicesTable.category, category.name)))
      .limit(1);
    if (service) {
      res.status(409).json({ error: "Categoria em uso por servicos. Altere ou exclua esses servicos primeiro." });
      return;
    }
  }

  if (category.type === "product") {
    const [product] = await db.select().from(productsTable)
      .where(and(eq(productsTable.barbershopId, shop), eq(productsTable.category, category.name)))
      .limit(1);
    if (product) {
      res.status(409).json({ error: "Categoria em uso por produtos. Altere ou exclua esses produtos primeiro." });
      return;
    }
  }

  if (category.type === "income" || category.type === "expense") {
    const [entry] = await db.select().from(cashEntriesTable)
      .where(and(
        eq(cashEntriesTable.barbershopId, shop),
        eq(cashEntriesTable.type, category.type),
        eq(cashEntriesTable.category, category.name),
      ))
      .limit(1);
    if (entry) {
      res.status(409).json({ error: "Categoria em uso por lancamentos financeiros." });
      return;
    }
  }

  await db.delete(categoriesTable).where(and(eq(categoriesTable.id, id), eq(categoriesTable.barbershopId, shop)));
  res.status(204).send();
});

export default router;
