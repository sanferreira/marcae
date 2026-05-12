import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc } from "drizzle-orm";
import { db, cashEntriesTable } from "@workspace/db";
import { requireAuth, requireRole } from "../lib/auth";
import { CashEntryCreate } from "../lib/schemas";
import { serializeCashEntry } from "../lib/serializers";

const router: IRouter = Router();
router.use(requireAuth);

router.get("/cash-entries", requireRole("admin", "employee"), async (req: Request, res: Response): Promise<void> => {
  const shop = req.auth!.barbershop.id;
  const rows = await db.select().from(cashEntriesTable)
    .where(eq(cashEntriesTable.barbershopId, shop))
    .orderBy(desc(cashEntriesTable.createdAt));
  res.json(rows.map(serializeCashEntry));
});

router.post("/cash-entries", requireRole("admin"), async (req: Request, res: Response): Promise<void> => {
  const parsed = CashEntryCreate.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }); return; }
  const shop = req.auth!.barbershop.id;
  const [row] = await db.insert(cashEntriesTable).values({
    barbershopId: shop,
    description: parsed.data.description,
    amount: String(parsed.data.amount),
    type: parsed.data.type,
    category: parsed.data.category,
    paymentMethod: parsed.data.paymentMethod,
    date: parsed.data.date,
    professionalId: parsed.data.professionalId ?? null,
    professionalName: parsed.data.professionalName ?? null,
  }).returning();
  res.status(201).json(serializeCashEntry(row));
});

export default router;
