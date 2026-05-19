import { pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { barbershopsTable } from "./barbershops";

export const categoriesTable = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  barbershopId: uuid("establishment_id").notNull().references(() => barbershopsTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'service' | 'product' | 'income' | 'expense'
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueCategory: uniqueIndex("categories_establishment_type_name_uq").on(table.barbershopId, table.type, table.name),
}));

export type Category = typeof categoriesTable.$inferSelect;
