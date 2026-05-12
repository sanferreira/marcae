import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, barbershopsTable } from "@workspace/db";
import { UpdateBarbershopSettingsBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { computePlanStatus, serializeBarbershop } from "../lib/serializers";

const router: IRouter = Router();

router.patch("/barbershop", requireAuth, async (req: Request, res: Response): Promise<void> => {
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

export default router;
