import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq } from "drizzle-orm";
import { db, productsTable } from "@workspace/db";
import { requireAuth, requireRole } from "../lib/auth";
import { ProductCreate, ProductUpdate } from "../lib/schemas";
import { serializeProduct } from "../lib/serializers";

const router: IRouter = Router();
router.use(requireAuth);

router.get("/products", async (req: Request, res: Response): Promise<void> => {
  const shop = req.auth!.barbershop.id;
  const rows = await db.select().from(productsTable).where(eq(productsTable.barbershopId, shop));
  res.json(rows.map(serializeProduct));
});

router.post("/products", requireRole("admin"), async (req: Request, res: Response): Promise<void> => {
  const parsed = ProductCreate.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }); return; }
  const shop = req.auth!.barbershop.id;
  const [row] = await db.insert(productsTable).values({
    barbershopId: shop,
    name: parsed.data.name,
    price: String(parsed.data.price),
    costPrice: String(parsed.data.costPrice),
    stock: parsed.data.stock,
    category: parsed.data.category,
    description: parsed.data.description,
    isActive: parsed.data.isActive,
  }).returning();
  res.status(201).json(serializeProduct(row));
});

router.patch("/products/:id", requireRole("admin"), async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = ProductUpdate.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }); return; }
  const shop = req.auth!.barbershop.id;
  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.price !== undefined) updates.price = String(parsed.data.price);
  if (parsed.data.costPrice !== undefined) updates.costPrice = String(parsed.data.costPrice);
  if (parsed.data.stock !== undefined) updates.stock = parsed.data.stock;
  if (parsed.data.category !== undefined) updates.category = parsed.data.category;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;
  if (parsed.data.isActive !== undefined) updates.isActive = parsed.data.isActive;
  const [row] = await db.update(productsTable).set(updates)
    .where(and(eq(productsTable.id, id), eq(productsTable.barbershopId, shop))).returning();
  if (!row) { res.status(404).json({ error: "Produto não encontrado." }); return; }
  res.json(serializeProduct(row));
});

export default router;
