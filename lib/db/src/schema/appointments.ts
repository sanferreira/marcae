import { pgTable, uuid, text, integer, numeric, date, timestamp, boolean } from "drizzle-orm/pg-core";
import { barbershopsTable } from "./barbershops";
import { clientsTable } from "./clients";
import { professionalsTable } from "./professionals";

export const appointmentsTable = pgTable("appointments", {
  id: uuid("id").primaryKey().defaultRandom(),
  barbershopId: uuid("establishment_id").notNull().references(() => barbershopsTable.id, { onDelete: "cascade" }),
  clientId: uuid("client_id").notNull().references(() => clientsTable.id, { onDelete: "cascade" }),
  clientName: text("client_name").notNull(),
  professionalId: uuid("professional_id").notNull().references(() => professionalsTable.id, { onDelete: "cascade" }),
  professionalName: text("professional_name").notNull(),
  date: date("date").notNull(),
  time: text("time").notNull(), // "HH:MM"
  totalPrice: numeric("total_price", { precision: 10, scale: 2 }).notNull(),
  totalDuration: integer("total_duration").notNull(),
  status: text("status").notNull().default("pending"),
  paymentMethod: text("payment_method"),
  isFreeByLoyalty: boolean("is_free_by_loyalty").notNull().default(false),
  clientNotes: text("client_notes").notNull().default(""),
  professionalNotes: text("professional_notes").notNull().default(""),
  reminder24hSentAt: timestamp("reminder_24h_sent_at", { withTimezone: true }),
  reminder2hSentAt: timestamp("reminder_2h_sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const appointmentServicesTable = pgTable("appointment_services", {
  id: uuid("id").primaryKey().defaultRandom(),
  appointmentId: uuid("appointment_id").notNull().references(() => appointmentsTable.id, { onDelete: "cascade" }),
  serviceId: uuid("service_id").notNull(),
  serviceName: text("service_name").notNull(),
  servicePrice: numeric("service_price", { precision: 10, scale: 2 }).notNull(),
  serviceDuration: integer("service_duration").notNull(),
});

export type Appointment = typeof appointmentsTable.$inferSelect;
export type AppointmentService = typeof appointmentServicesTable.$inferSelect;
