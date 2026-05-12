import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const barbershopsTable = pgTable("barbershops", {
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
  brandPrimary: text("brand_primary").notNull().default("#C9A96E"),
  brandAccent: text("brand_accent").notNull().default("#0C0C0C"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Barbershop = typeof barbershopsTable.$inferSelect;
