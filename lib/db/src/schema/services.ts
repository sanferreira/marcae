import { pgTable, uuid, text, integer, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { barbershopsTable } from "./barbershops";

export const servicesTable = pgTable("services", {
  id: uuid("id").primaryKey().defaultRandom(),
  barbershopId: uuid("barbershop_id").notNull().references(() => barbershopsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  duration: integer("duration").notNull(),
  description: text("description").notNull().default(""),
  category: text("category").notNull().default("Geral"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Service = typeof servicesTable.$inferSelect;
