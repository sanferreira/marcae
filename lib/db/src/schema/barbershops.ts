import { integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export type BusinessSchedule = Record<string, { enabled: boolean; startTime: string; endTime: string }>;
export type IntakeField = { key: string; label: string; type: "text" | "textarea" | "date" | "phone" };

export const establishmentsTable = pgTable("establishments", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  ownerName: text("owner_name").notNull(),
  ownerEmail: text("owner_email").notNull(),
  phone: text("phone"),
  address: text("address"),
  plan: text("plan").notNull().default("trial"),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }).notNull(),
  subscriptionRenewsAt: timestamp("subscription_renews_at", { withTimezone: true }),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  brandPrimary: text("brand_primary").notNull().default("#556B2F"),
  brandAccent: text("brand_accent").notNull().default("#3A3328"),
  bookingBufferMinutes: integer("booking_buffer_minutes").notNull().default(0),
  bookingAvailabilityMode: text("booking_availability_mode").notNull().default("duration_buffer"),
  businessSchedule: jsonb("business_schedule").$type<BusinessSchedule>(),
  intakeFields: jsonb("intake_fields").$type<IntakeField[]>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const barbershopsTable = establishmentsTable;

export type Establishment = typeof establishmentsTable.$inferSelect;
export type Barbershop = Establishment;
