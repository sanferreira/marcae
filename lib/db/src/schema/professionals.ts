import { pgTable, uuid, text, integer, numeric, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { barbershopsTable } from "./barbershops";
import { servicesTable } from "./services";

export const professionalsTable = pgTable("professionals", {
  id: uuid("id").primaryKey().defaultRandom(),
  barbershopId: uuid("establishment_id").notNull().references(() => barbershopsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  specialty: text("specialty").notNull().default(""),
  rating: numeric("rating", { precision: 3, scale: 2 }).notNull().default("5.00"),
  appointmentsCount: integer("appointments_count").notNull().default(0),
  isAvailable: boolean("is_available").notNull().default(true),
  avatar: text("avatar").notNull().default(""),
  avatarImage: text("avatar_image"),
  bio: text("bio").notNull().default(""),
  phone: text("phone"),
  email: text("email"),
  commissionRate: integer("commission_rate").notNull().default(50),
  schedule: jsonb("schedule").notNull().$type<Record<string, { enabled: boolean; startTime: string; endTime: string }>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const professionalServicesTable = pgTable("professional_services", {
  id: uuid("id").primaryKey().defaultRandom(),
  professionalId: uuid("professional_id").notNull().references(() => professionalsTable.id, { onDelete: "cascade" }),
  serviceId: uuid("service_id").notNull().references(() => servicesTable.id, { onDelete: "cascade" }),
});

export type Professional = typeof professionalsTable.$inferSelect;
export type ProfessionalService = typeof professionalServicesTable.$inferSelect;
