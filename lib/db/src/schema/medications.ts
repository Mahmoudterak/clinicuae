import { pgTable, text, serial, integer, timestamp, doublePrecision } from "drizzle-orm/pg-core";

export const medicationsTable = pgTable("medications", {
  id: serial("id").primaryKey(),
  clinicId: integer("clinic_id"),
  name: text("name").notNull(),
  genericName: text("generic_name"),
  category: text("category").notNull().default("general"),
  form: text("form").notNull().default("tablet"),
  strength: text("strength"),
  unit: text("unit").notNull().default("units"),
  stockQuantity: integer("stock_quantity").notNull().default(0),
  minStockLevel: integer("min_stock_level").notNull().default(10),
  pricePerUnit: doublePrecision("price_per_unit"),
  manufacturer: text("manufacturer"),
  expiryDate: text("expiry_date"),
  notes: text("notes"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Medication = typeof medicationsTable.$inferSelect;
export type InsertMedication = typeof medicationsTable.$inferInsert;
