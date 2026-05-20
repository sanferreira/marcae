import { Router, type IRouter, type Request, type Response } from "express";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  appointmentsTable,
  cashEntriesTable,
  categoriesTable,
  clientsTable,
  db,
  productOrderItemsTable,
  productOrdersTable,
  productsTable,
  type User,
  usersTable,
} from "@workspace/db";
import { requireAuth, requireRole } from "../lib/auth";
import { toBusinessDateString } from "../lib/dates";
import { planHasFeature } from "../lib/plans";
import { sendExpoPush } from "../lib/push";
import { ProductOrderCreate, ProductOrderUpdate } from "../lib/schemas";
import { serializeProductOrder } from "../lib/serializers";

const router: IRouter = Router();
router.use(requireAuth);

async function resolveClientIdentity(shop: string, user: User): Promise<{ id: string; name: string } | null> {
  if (user.clientId) return { id: user.clientId, name: user.name };

  const email = user.email.trim().toLowerCase();
  const [client] = await db.select().from(clientsTable)
    .where(and(eq(clientsTable.barbershopId, shop), eq(clientsTable.email, email)))
    .limit(1);
  if (!client) return null;

  await db.update(usersTable).set({ clientId: client.id })
    .where(and(eq(usersTable.id, user.id), eq(usersTable.barbershopId, shop)));
  return { id: client.id, name: client.name || user.name };
}

router.get("/product-orders", async (req: Request, res: Response): Promise<void> => {
  const shop = req.auth!.barbershop.id;
  const auth = req.auth!;

  const clientIdentity = auth.user.role === "client"
    ? await resolveClientIdentity(shop, auth.user)
    : null;
  if (auth.user.role === "client" && !clientIdentity) { res.json([]); return; }

  const orders = await db.select().from(productOrdersTable)
    .where(auth.user.role === "client"
      ? and(eq(productOrdersTable.barbershopId, shop), eq(productOrdersTable.clientId, clientIdentity!.id))
      : eq(productOrdersTable.barbershopId, shop))
    .orderBy(desc(productOrdersTable.createdAt));

  if (orders.length === 0) {
    res.json([]);
    return;
  }

  const orderIds = orders.map((order) => order.id);
  const items = await db.select().from(productOrderItemsTable)
    .where(inArray(productOrderItemsTable.orderId, orderIds));
  const grouped = new Map<string, typeof items>();

  for (const item of items) {
    const list = grouped.get(item.orderId) ?? [];
    list.push(item);
    grouped.set(item.orderId, list);
  }

  res.json(orders.map((order) => serializeProductOrder(order, grouped.get(order.id) ?? [])));
});

router.post("/product-orders", requireRole("client"), async (req: Request, res: Response): Promise<void> => {
  const parsed = ProductOrderCreate.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Dados invalidos" });
    return;
  }

  const shop = req.auth!.barbershop.id;
  const user = req.auth!.user;
  const clientIdentity = await resolveClientIdentity(shop, user);
  if (!clientIdentity) {
    res.status(400).json({ error: "Conta de cliente sem cadastro vinculado." });
    return;
  }

  const requestedByProduct = new Map<string, number>();
  for (const item of parsed.data.items) {
    requestedByProduct.set(item.productId, (requestedByProduct.get(item.productId) ?? 0) + item.quantity);
  }

  const productIds = Array.from(requestedByProduct.keys());
  const products = await db.select().from(productsTable)
    .where(and(eq(productsTable.barbershopId, shop), inArray(productsTable.id, productIds)));

  if (products.length !== productIds.length) {
    res.status(400).json({ error: "Produto invalido para este estabelecimento." });
    return;
  }

  for (const product of products) {
    const quantity = requestedByProduct.get(product.id) ?? 0;
    if (!product.isActive) {
      res.status(409).json({ error: `${product.name} nao esta disponivel para venda.` });
      return;
    }
    if (product.stock < quantity) {
      res.status(409).json({ error: `${product.name} tem apenas ${product.stock} unidade(s) em estoque.` });
      return;
    }
  }

  let appointmentId: string | null = null;
  if (parsed.data.appointmentId) {
    const [appointment] = await db.select().from(appointmentsTable)
      .where(and(
        eq(appointmentsTable.id, parsed.data.appointmentId),
        eq(appointmentsTable.barbershopId, shop),
        eq(appointmentsTable.clientId, clientIdentity.id),
      ))
      .limit(1);
    if (!appointment) {
      res.status(400).json({ error: "Agendamento invalido para este pedido." });
      return;
    }
    appointmentId = appointment.id;
  }

  const order = await db.transaction(async (tx) => {
    const total = products.reduce((sum, product) => {
      const quantity = requestedByProduct.get(product.id) ?? 0;
      return sum + parseFloat(product.price) * quantity;
    }, 0);

    const [created] = await tx.insert(productOrdersTable).values({
      barbershopId: shop,
      clientId: clientIdentity.id,
      appointmentId,
      clientName: clientIdentity.name,
      totalPrice: total.toFixed(2),
      status: "pending",
      notes: parsed.data.notes,
    }).returning();

    const orderItems = products.map((product) => ({
      orderId: created.id,
      productId: product.id,
      productName: product.name,
      unitPrice: product.price,
      quantity: requestedByProduct.get(product.id) ?? 0,
    }));
    const insertedItems = await tx.insert(productOrderItemsTable).values(orderItems).returning();

    for (const item of orderItems) {
      await tx.update(productsTable)
        .set({ stock: sql`${productsTable.stock} - ${item.quantity}` })
        .where(and(eq(productsTable.id, item.productId), eq(productsTable.barbershopId, shop)));
    }

    return serializeProductOrder(created, insertedItems);
  });

  res.status(201).json(order);
});

router.post("/product-orders/:id/checkout", requireRole("client"), (_req: Request, res: Response): void => {
  res.status(501).json({
    error: "Checkout da plataforma desativado para pedidos de produtos. O pagamento deve ser combinado com o estabelecimento.",
  });
});

router.patch("/product-orders/:id", requireRole("admin", "employee", "client"), async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = ProductOrderUpdate.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Dados invalidos" });
    return;
  }

  const shop = req.auth!.barbershop.id;
  const auth = req.auth!;
  const clientIdentity = auth.user.role === "client"
    ? await resolveClientIdentity(shop, auth.user)
    : null;
  const [existing] = await db.select().from(productOrdersTable)
    .where(and(eq(productOrdersTable.id, id), eq(productOrdersTable.barbershopId, shop)))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Pedido nao encontrado." });
    return;
  }

  if (auth.user.role === "client") {
    if (!clientIdentity || existing.clientId !== clientIdentity.id) {
      res.status(403).json({ error: "Acesso negado." });
      return;
    }
    if (parsed.data.status !== "cancelled" || existing.status !== "pending") {
      res.status(403).json({ error: "Cliente so pode cancelar pedido pendente." });
      return;
    }
  }

  if (parsed.data.status === "cancelled" && existing.status !== "pending") {
    res.status(409).json({ error: "Somente pedidos pendentes podem ser cancelados." });
    return;
  }

  const result = await db.transaction(async (tx) => {
    const items = await tx.select().from(productOrderItemsTable)
      .where(eq(productOrderItemsTable.orderId, existing.id));

    const [updated] = await tx.update(productOrdersTable).set({
      status: parsed.data.status,
      paymentMethod: parsed.data.status === "paid" ? parsed.data.paymentMethod : existing.paymentMethod,
    }).where(and(eq(productOrdersTable.id, id), eq(productOrdersTable.barbershopId, shop))).returning();

    if (parsed.data.status === "cancelled" && existing.status !== "cancelled") {
      for (const item of items) {
        await tx.update(productsTable)
          .set({ stock: sql`${productsTable.stock} + ${item.quantity}` })
          .where(and(eq(productsTable.id, item.productId), eq(productsTable.barbershopId, shop)));
      }
    }

    if (parsed.data.status === "paid" && existing.status !== "paid") {
      const today = toBusinessDateString();
      await tx.insert(categoriesTable).values({
        barbershopId: shop,
        type: "income",
        name: "Produtos",
      }).onConflictDoNothing();

      await tx.insert(cashEntriesTable).values({
        barbershopId: shop,
        description: `Venda de produtos - ${existing.clientName}`,
        amount: existing.totalPrice,
        type: "income",
        category: "Produtos",
        paymentMethod: parsed.data.paymentMethod,
        date: today,
      });
    }

    return serializeProductOrder(updated, items);
  });

  if (planHasFeature(req.auth!.barbershop.plan, "notifications") && auth.user.role !== "client") {
    const [clientUser] = await db.select({ token: usersTable.expoPushToken })
      .from(usersTable)
      .where(and(
        eq(usersTable.barbershopId, shop),
        eq(usersTable.clientId, existing.clientId),
      ))
      .limit(1);
    const statusText = parsed.data.status === "paid"
      ? "Seu pedido foi marcado como pago."
      : parsed.data.status === "delivered"
        ? "Seu pedido foi entregue."
        : parsed.data.status === "cancelled"
          ? "Seu pedido foi cancelado."
          : "Seu pedido foi atualizado.";
    if (clientUser?.token) {
      void sendExpoPush([{
        to: clientUser.token,
        title: "Pedido atualizado",
        body: statusText,
        data: { type: "product_order.updated", orderId: existing.id },
      }]).catch((err) => req.log.warn({ err, orderId: existing.id }, "failed to dispatch product order push notification"));
    }
  }

  res.json(result);
});

export default router;
