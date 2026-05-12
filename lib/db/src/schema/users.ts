import { pgTable, uuid, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { barbershopsTable } from "./barbershops";

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  barbershopId: uuid("barbershop_id").notNull().references(() => barbershopsTable.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // 'admin' | 'employee' | 'client'
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  passwordHash: text("password_hash").notNull(),
  professionalId: uuid("professional_id"), // optional FK added later
  clientId: uuid("client_id"), // optional FK added later
  expoPushToken: text("expo_push_token"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqEmail: uniqueIndex("users_barbershop_email_uq").on(t.barbershopId, t.email),
}));

export type User = typeof usersTable.$inferSelect;
