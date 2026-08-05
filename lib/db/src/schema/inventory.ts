import { pgTable, text, serial, integer, timestamp, doublePrecision } from "drizzle-orm/pg-core";

export const inventoryTable = pgTable("inventory", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull().default("supplies"),
  sku: text("sku"),
  quantity: integer("quantity").notNull().default(0),
  minQuantity: integer("min_quantity").notNull().default(5),
  unit: text("unit").notNull().default("units"),
  costPerUnit: doublePrecision("cost_per_unit"),
  supplier: text("supplier"),
  location: text("location"),
  expiryDate: text("expiry_date"),
  status: text("status").notNull().default("in_stock"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type InventoryItem = typeof inventoryTable.$inferSelect;
export type InsertInventoryItem = typeof inventoryTable.$inferInsert;
