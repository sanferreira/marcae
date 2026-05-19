import { pgTable, uuid, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { appointmentsTable } from "./appointments";
import { barbershopsTable } from "./barbershops";
import { clientsTable } from "./clients";

export const productOrdersTable = pgTable("product_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  barbershopId: uuid("establishment_id").notNull().references(() => barbershopsTable.id, { onDelete: "cascade" }),
  clientId: uuid("client_id").notNull().references(() => clientsTable.id, { onDelete: "cascade" }),
  appointmentId: uuid("appointment_id").references(() => appointmentsTable.id, { onDelete: "set null" }),
  clientName: text("client_name").notNull(),
  status: text("status").notNull().default("pending"),
  totalPrice: numeric("total_price", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method"),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productOrderItemsTable = pgTable("product_order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => productOrdersTable.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull(),
  productName: text("product_name").notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
});

export type ProductOrder = typeof productOrdersTable.$inferSelect;
export type ProductOrderItem = typeof productOrderItemsTable.$inferSelect;
