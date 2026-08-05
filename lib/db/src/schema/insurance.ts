import { pgTable, text, serial, integer, timestamp, date, doublePrecision } from "drizzle-orm/pg-core";
import { patientsTable } from "./patients";

export const insuranceTable = pgTable("insurance", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patientsTable.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  policyNumber: text("policy_number").notNull(),
  groupNumber: text("group_number"),
  planName: text("plan_name"),
  holderName: text("holder_name"),
  relationship: text("relationship").notNull().default("self"),
  coverageType: text("coverage_type").notNull().default("comprehensive"),
  coveragePercent: doublePrecision("coverage_percent").default(80),
  deductible: doublePrecision("deductible").default(0),
  expiryDate: date("expiry_date", { mode: "string" }),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Insurance = typeof insuranceTable.$inferSelect;
export type InsertInsurance = typeof insuranceTable.$inferInsert;
