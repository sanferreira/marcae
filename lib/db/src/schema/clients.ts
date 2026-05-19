import { pgTable, uuid, text, integer, numeric, date, timestamp, jsonb } from "drizzle-orm/pg-core";
import { barbershopsTable } from "./barbershops";

export const clientsTable = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  barbershopId: uuid("establishment_id").notNull().references(() => barbershopsTable.id, { onDelete: "cascade" }),
  userId: uuid("user_id"), // nullable: walk-in clients have no app login
  name: text("name").notNull(),
  phone: text("phone").notNull().default(""),
  email: text("email").notNull().default(""),
  birthDate: date("birth_date"),
  totalSpent: numeric("total_spent", { precision: 10, scale: 2 }).notNull().default("0"),
  appointmentsCount: integer("appointments_count").notNull().default(0),
  lastVisit: date("last_visit"),
  loyaltyPoints: integer("loyalty_points").notNull().default(0),
  notes: text("notes"),
  allergies: text("allergies").notNull().default(""),
  restrictions: text("restrictions").notNull().default(""),
  preferences: text("preferences").notNull().default(""),
  emergencyContact: text("emergency_contact").notNull().default(""),
  intakeData: jsonb("intake_data").$type<Record<string, string>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Client = typeof clientsTable.$inferSelect;
