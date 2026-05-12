import { pgTable, uuid, text, numeric, date, timestamp } from "drizzle-orm/pg-core";
import { barbershopsTable } from "./barbershops";

export const cashEntriesTable = pgTable("cash_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  barbershopId: uuid("barbershop_id").notNull().references(() => barbershopsTable.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  type: text("type").notNull(), // 'income' | 'expense'
  category: text("category").notNull().default("Outro"),
  paymentMethod: text("payment_method").notNull().default("Dinheiro"),
  date: date("date").notNull(),
  professionalId: uuid("professional_id"),
  professionalName: text("professional_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CashEntry = typeof cashEntriesTable.$inferSelect;
