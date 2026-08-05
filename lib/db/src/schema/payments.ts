import { pgTable, text, serial, integer, timestamp, date, doublePrecision } from "drizzle-orm/pg-core";
import { invoicesTable } from "./invoices";
import { patientsTable } from "./patients";

export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").references(() => invoicesTable.id, { onDelete: "cascade" }),
  patientId: integer("patient_id").notNull().references(() => patientsTable.id, { onDelete: "cascade" }),
  amount: doublePrecision("amount").notNull(),
  method: text("method").notNull().default("cash"), // cash, card, bank_transfer, insurance
  status: text("status").notNull().default("completed"),
  reference: text("reference"),
  notes: text("notes"),
  paymentDate: date("payment_date", { mode: "string" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Payment = typeof paymentsTable.$inferSelect;
export type InsertPayment = typeof paymentsTable.$inferInsert;
