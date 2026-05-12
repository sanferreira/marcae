import { pgTable, uuid, text, integer, date, timestamp } from "drizzle-orm/pg-core";
import { barbershopsTable } from "./barbershops";
import { clientsTable } from "./clients";

export const loyaltySettingsTable = pgTable("loyalty_settings", {
  barbershopId: uuid("barbershop_id").primaryKey().references(() => barbershopsTable.id, { onDelete: "cascade" }),
  requiredPoints: integer("required_points").notNull().default(10),
  benefitDescription: text("benefit_description").notNull().default("Corte gratuito"),
});

export const loyaltyMovementsTable = pgTable("loyalty_movements", {
  id: uuid("id").primaryKey().defaultRandom(),
  barbershopId: uuid("barbershop_id").notNull().references(() => barbershopsTable.id, { onDelete: "cascade" }),
  clientId: uuid("client_id").notNull().references(() => clientsTable.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  points: integer("points").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(), // 'earned' | 'redeemed' | 'adjusted'
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type LoyaltySettings = typeof loyaltySettingsTable.$inferSelect;
export type LoyaltyMovement = typeof loyaltyMovementsTable.$inferSelect;
