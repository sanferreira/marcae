import { pgTable, uuid, text, integer, numeric, date, boolean, timestamp } from "drizzle-orm/pg-core";
import { appointmentsTable } from "./appointments";
import { barbershopsTable } from "./barbershops";
import { clientsTable } from "./clients";
import { servicesTable } from "./services";

export const servicePackagesTable = pgTable("service_packages", {
  id: uuid("id").primaryKey().defaultRandom(),
  barbershopId: uuid("establishment_id").notNull().references(() => barbershopsTable.id, { onDelete: "cascade" }),
  serviceId: uuid("service_id").references(() => servicesTable.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  sessionsTotal: integer("sessions_total").notNull().default(1),
  price: numeric("price", { precision: 10, scale: 2 }).notNull().default("0"),
  validityDays: integer("validity_days").notNull().default(90),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const clientPackagesTable = pgTable("client_packages", {
  id: uuid("id").primaryKey().defaultRandom(),
  barbershopId: uuid("establishment_id").notNull().references(() => barbershopsTable.id, { onDelete: "cascade" }),
  clientId: uuid("client_id").notNull().references(() => clientsTable.id, { onDelete: "cascade" }),
  packageId: uuid("package_id").references(() => servicePackagesTable.id, { onDelete: "set null" }),
  serviceId: uuid("service_id").references(() => servicesTable.id, { onDelete: "set null" }),
  packageName: text("package_name").notNull(),
  serviceName: text("service_name").notNull().default("Qualquer servico"),
  sessionsTotal: integer("sessions_total").notNull(),
  sessionsUsed: integer("sessions_used").notNull().default(0),
  pricePaid: numeric("price_paid", { precision: 10, scale: 2 }).notNull().default("0"),
  expiresAt: date("expires_at"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const clientPackageUsagesTable = pgTable("client_package_usages", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientPackageId: uuid("client_package_id").notNull().references(() => clientPackagesTable.id, { onDelete: "cascade" }),
  appointmentId: uuid("appointment_id").notNull().references(() => appointmentsTable.id, { onDelete: "cascade" }),
  usedAt: timestamp("used_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ServicePackage = typeof servicePackagesTable.$inferSelect;
export type ClientPackage = typeof clientPackagesTable.$inferSelect;
export type ClientPackageUsage = typeof clientPackageUsagesTable.$inferSelect;
