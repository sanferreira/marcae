import { pgTable, uuid, text, integer, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { barbershopsTable } from "./barbershops";

export const productsTable = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  barbershopId: uuid("barbershop_id").notNull().references(() => barbershopsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  costPrice: numeric("cost_price", { precision: 10, scale: 2 }).notNull().default("0"),
  stock: integer("stock").notNull().default(0),
  category: text("category").notNull().default("Geral"),
  description: text("description").notNull().default(""),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Product = typeof productsTable.$inferSelect;
