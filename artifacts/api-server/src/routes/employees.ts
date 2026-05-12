import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq, ne } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { requireAuth, requireRole } from "../lib/auth";
import { EmployeeUpsert } from "../lib/schemas";
import { hashPassword } from "../lib/password";
import { serializeUser } from "../lib/serializers";

const router: IRouter = Router();
router.use(requireAuth);

router.get("/employees", async (req: Request, res: Response): Promise<void> => {
  const shop = req.auth!.barbershop.id;
  const rows = await db.select().from(usersTable)
    .where(and(eq(usersTable.barbershopId, shop), eq(usersTable.role, "employee")));
  res.json(rows.map(serializeUser));
});

router.post("/employees", requireRole("admin"), async (req: Request, res: Response): Promise<void> => {
  const parsed = EmployeeUpsert.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }); return; }
  const shop = req.auth!.barbershop.id;
  const email = parsed.data.email.trim().toLowerCase();
  const [existing] = await db.select().from(usersTable).where(and(
    eq(usersTable.barbershopId, shop),
    eq(usersTable.professionalId, parsed.data.professionalId),
  )).limit(1);

  if (!existing && !parsed.data.password) {
    res.status(400).json({ error: "Senha é obrigatória ao criar um novo acesso." });
    return;
  }

  // Email collision (excluding the same user)
  const collisions = await db.select().from(usersTable).where(and(
    eq(usersTable.barbershopId, shop),
    eq(usersTable.email, email),
    existing ? ne(usersTable.id, existing.id) : ne(usersTable.id, "00000000-0000-0000-0000-000000000000"),
  )).limit(1);
  if (collisions.length > 0) {
    res.status(409).json({ error: "Email já está em uso por outro usuário." });
    return;
  }

  if (existing) {
    const updates: Record<string, unknown> = {
      name: parsed.data.name, email,
      phone: parsed.data.phone ?? null,
    };
    if (parsed.data.password) updates.passwordHash = await hashPassword(parsed.data.password);
    const [row] = await db.update(usersTable).set(updates).where(eq(usersTable.id, existing.id)).returning();
    res.json(serializeUser(row));
    return;
  }

  const passwordHash = await hashPassword(parsed.data.password!);
  const [row] = await db.insert(usersTable).values({
    barbershopId: shop,
    role: "employee",
    name: parsed.data.name,
    email,
    phone: parsed.data.phone ?? null,
    professionalId: parsed.data.professionalId,
    passwordHash,
  }).returning();
  res.status(201).json(serializeUser(row));
});

router.delete("/employees/:id", requireRole("admin"), async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const shop = req.auth!.barbershop.id;
  await db.delete(usersTable)
    .where(and(eq(usersTable.id, id), eq(usersTable.barbershopId, shop), eq(usersTable.role, "employee")));
  res.status(204).end();
});

export default router;
