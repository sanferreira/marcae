import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and } from "drizzle-orm";
import {
  db, barbershopsTable, usersTable, servicesTable, productsTable, professionalsTable,
  clientsTable, appointmentsTable, appointmentServicesTable, cashEntriesTable,
  loyaltyMovementsTable, loyaltySettingsTable,
} from "@workspace/db";
import { hashPassword } from "../lib/password";
import { DEFAULT_SCHEDULE } from "../lib/schemas";

const router: IRouter = Router();

const fmt = (d: Date) => d.toISOString().split("T")[0];
const today = new Date();
const dayOffset = (n: number) => fmt(new Date(today.getTime() + n * 86400000));

router.post("/_dev/seed-demo", async (_req: Request, res: Response): Promise<void> => {
  if (process.env.NODE_ENV === "production") {
    res.status(404).json({ error: "Not found." });
    return;
  }
  const [shop] = await db.select().from(barbershopsTable)
    .where(eq(barbershopsTable.slug, "primeiro_nucleo")).limit(1);
  if (!shop) { res.status(404).json({ error: "Demo barbershop not found." }); return; }

  // Idempotent: if services already seeded, do nothing
  const existing = await db.select().from(servicesTable)
    .where(eq(servicesTable.barbershopId, shop.id)).limit(1);
  if (existing.length > 0) { res.json({ ok: true, message: "Already seeded." }); return; }

  // Services
  const services = await db.insert(servicesTable).values([
    { barbershopId: shop.id, name: "Corte de Cabelo", price: "45", duration: 30, description: "Corte clássico ou moderno", category: "Cabelo" },
    { barbershopId: shop.id, name: "Barba", price: "35", duration: 25, description: "Aparagem e modelagem com toalha quente", category: "Barba" },
    { barbershopId: shop.id, name: "Corte + Barba", price: "70", duration: 50, description: "Combo completo", category: "Combo" },
    { barbershopId: shop.id, name: "Sobrancelha", price: "20", duration: 15, description: "Modelagem com pinça ou navalha", category: "Estética" },
    { barbershopId: shop.id, name: "Hidratação Capilar", price: "55", duration: 40, description: "Tratamento profundo", category: "Tratamento" },
    { barbershopId: shop.id, name: "Bigode", price: "15", duration: 15, description: "Aparagem e modelagem", category: "Barba" },
  ]).returning();

  // Products
  await db.insert(productsTable).values([
    { barbershopId: shop.id, name: "Pomada Matte", price: "45", costPrice: "20", stock: 12, category: "Pomada", description: "Pomada com fixação forte" },
    { barbershopId: shop.id, name: "Pomada Brilho", price: "40", costPrice: "18", stock: 8, category: "Pomada", description: "Fixação média e brilho intenso" },
    { barbershopId: shop.id, name: "Óleo para Barba", price: "55", costPrice: "22", stock: 15, category: "Barba", description: "Óleo hidratante e perfumado" },
    { barbershopId: shop.id, name: "Balm para Barba", price: "48", costPrice: "20", stock: 6, category: "Barba", description: "Balm nutritivo" },
    { barbershopId: shop.id, name: "Shampoo Anticaspa", price: "35", costPrice: "15", stock: 20, category: "Cabelo", description: "Shampoo profissional" },
    { barbershopId: shop.id, name: "Cera Modeladora", price: "38", costPrice: "16", stock: 10, category: "Pomada", description: "Cera com fixação leve" },
  ]);

  // Professionals
  const profs = await db.insert(professionalsTable).values([
    { barbershopId: shop.id, name: "Rafael Mendes", specialty: "Cortes Clássicos", rating: "4.9", appointmentsCount: 312, avatar: "RM", bio: "10 anos de experiência", phone: "(11) 99111-1111", email: "rafael@barberpro.com", commissionRate: 50, schedule: DEFAULT_SCHEDULE },
    { barbershopId: shop.id, name: "Diego Santos", specialty: "Barbas & Design", rating: "4.8", appointmentsCount: 278, avatar: "DS", bio: "Especialista em barba", phone: "(11) 99222-2222", email: "diego@barberpro.com", commissionRate: 50, schedule: DEFAULT_SCHEDULE },
    { barbershopId: shop.id, name: "Lucas Oliveira", specialty: "Cortes Modernos", rating: "4.7", appointmentsCount: 195, avatar: "LO", bio: "Tendências e coloração", phone: "(11) 99333-3333", email: "lucas@barberpro.com", commissionRate: 45, schedule: { ...DEFAULT_SCHEDULE, seg: { enabled: false, startTime: "08:00", endTime: "18:00" }, sab: { enabled: false, startTime: "08:00", endTime: "13:00" } } },
  ]).returning();

  // Link the existing employee (rafael@barberpro.com if exists) to first professional
  const [rafa] = await db.select().from(usersTable).where(and(
    eq(usersTable.barbershopId, shop.id), eq(usersTable.email, "rafael@barberpro.com"),
  )).limit(1);
  if (!rafa) {
    const passwordHash = await hashPassword("func123");
    await db.insert(usersTable).values({
      barbershopId: shop.id, role: "employee",
      name: "Rafael Mendes", email: "rafael@barberpro.com",
      phone: "(11) 99111-1111", professionalId: profs[0].id, passwordHash,
    });
  } else {
    await db.update(usersTable).set({ professionalId: profs[0].id }).where(eq(usersTable.id, rafa.id));
  }

  // Clients (CRM rows). Reuse existing João if it exists.
  const [joao] = await db.select().from(clientsTable).where(and(
    eq(clientsTable.barbershopId, shop.id), eq(clientsTable.email, "joao@email.com"),
  )).limit(1);
  const otherClients = await db.insert(clientsTable).values([
    { barbershopId: shop.id, name: "Marcos Pereira", phone: "(11) 97654-3210", email: "marcos@email.com", totalSpent: "680", appointmentsCount: 12, lastVisit: dayOffset(0), loyaltyPoints: 7 },
    { barbershopId: shop.id, name: "Bruno Lima", phone: "(11) 96543-2109", email: "bruno@email.com", totalSpent: "315", appointmentsCount: 6, lastVisit: dayOffset(-14), loyaltyPoints: 3 },
    { barbershopId: shop.id, name: "André Costa", phone: "(11) 95432-1098", email: "andre@email.com", totalSpent: "920", appointmentsCount: 18, lastVisit: dayOffset(-3), loyaltyPoints: 9, notes: "Cliente VIP" },
    { barbershopId: shop.id, name: "Pedro Souza", phone: "(11) 94321-0987", email: "pedro@email.com", totalSpent: "180", appointmentsCount: 4, lastVisit: dayOffset(-30), loyaltyPoints: 2 },
  ]).returning();
  if (joao) {
    await db.update(clientsTable).set({
      totalSpent: "420", appointmentsCount: 8, lastVisit: dayOffset(-7),
      loyaltyPoints: 4, notes: "Prefere corte máquina 2 na lateral",
    }).where(eq(clientsTable.id, joao.id));
  }

  const allClients = [...(joao ? [{ ...joao, name: "João Silva" }] : []), ...otherClients];
  const findClient = (name: string) => allClients.find((c) => c.name === name)!;

  // Appointments
  const apptsData: Array<{
    clientName: string; profIdx: number; date: string; time: string;
    serviceIdx: number[]; status: "pending" | "confirmed" | "completed" | "cancelled"; paymentMethod?: string;
  }> = [
    { clientName: "João Silva", profIdx: 0, date: dayOffset(1), time: "09:00", serviceIdx: [0], status: "confirmed" },
    { clientName: "João Silva", profIdx: 1, date: dayOffset(-7), time: "14:00", serviceIdx: [2], status: "completed", paymentMethod: "PIX" },
    { clientName: "Marcos Pereira", profIdx: 0, date: dayOffset(0), time: "11:00", serviceIdx: [0, 1], status: "confirmed" },
    { clientName: "Bruno Lima", profIdx: 2, date: dayOffset(0), time: "15:30", serviceIdx: [0], status: "pending" },
    { clientName: "André Costa", profIdx: 1, date: dayOffset(-14), time: "10:00", serviceIdx: [2], status: "completed", paymentMethod: "Cartão" },
    { clientName: "Pedro Souza", profIdx: 0, date: dayOffset(-30), time: "16:00", serviceIdx: [0], status: "completed", paymentMethod: "Dinheiro" },
    { clientName: "João Silva", profIdx: 0, date: dayOffset(0), time: "16:30", serviceIdx: [2], status: "confirmed" },
  ];

  for (const a of apptsData) {
    const client = joao && a.clientName === "João Silva" ? joao : findClient(a.clientName);
    if (!client) continue;
    const prof = profs[a.profIdx];
    const svcs = a.serviceIdx.map((i) => services[i]);
    const totalPrice = svcs.reduce((s, x) => s + parseFloat(x.price), 0);
    const totalDuration = svcs.reduce((s, x) => s + x.duration, 0);
    const [appt] = await db.insert(appointmentsTable).values({
      barbershopId: shop.id, clientId: client.id, clientName: client.name,
      professionalId: prof.id, professionalName: prof.name,
      date: a.date, time: a.time,
      totalPrice: String(totalPrice), totalDuration,
      status: a.status, paymentMethod: a.paymentMethod ?? null,
    }).returning();
    await db.insert(appointmentServicesTable).values(
      svcs.map((s) => ({
        appointmentId: appt.id, serviceId: s.id, serviceName: s.name,
        servicePrice: s.price, serviceDuration: s.duration,
      })),
    );
  }

  // Cash entries
  await db.insert(cashEntriesTable).values([
    { barbershopId: shop.id, description: "Corte + Barba - Marcos", amount: "80", type: "income", category: "Serviço", paymentMethod: "PIX", date: dayOffset(0), professionalName: "Rafael Mendes" },
    { barbershopId: shop.id, description: "Corte - André", amount: "45", type: "income", category: "Serviço", paymentMethod: "Dinheiro", date: dayOffset(0), professionalName: "Diego Santos" },
    { barbershopId: shop.id, description: "Produtos de cabelo", amount: "180", type: "expense", category: "Produto", paymentMethod: "Cartão de Débito", date: dayOffset(0) },
  ]);

  // Loyalty settings
  await db.insert(loyaltySettingsTable).values({
    barbershopId: shop.id, requiredPoints: 10, benefitDescription: "Corte de cabelo gratuito",
  }).onConflictDoNothing();

  // Loyalty movements (one per existing client)
  for (const c of allClients) {
    if (c.loyaltyPoints > 0) {
      await db.insert(loyaltyMovementsTable).values({
        barbershopId: shop.id, clientId: c.id,
        date: dayOffset(-7), points: c.loyaltyPoints,
        description: "Saldo inicial", type: "adjusted",
      });
    }
  }

  res.status(201).json({ ok: true, message: "Demo data seeded." });
});

export default router;
