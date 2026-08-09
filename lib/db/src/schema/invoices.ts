import { pgTable, text, serial, integer, timestamp, date, doublePrecision, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { patientsTable } from "./patients";

export const invoicesTable = pgTable(
  "invoices",
  {
    id: serial("id").primaryKey(),
    clinicId: integer("clinic_id"),
    patientId: integer("patient_id")
      .notNull()
      .references(() => patientsTable.id, { onDelete: "cascade" }),
    amount: doublePrecision("amount").notNull(),
    status: text("status").notNull().default("pending"),
    description: text("description").notNull(),
    issuedDate: date("issued_date", { mode: "string" }).notNull(),
    dueDate: date("due_date", { mode: "string" }),
    paidDate: date("paid_date", { mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("invoices_patient_idx").on(t.patientId), index("invoices_status_idx").on(t.status)],
);

export const insertInvoiceSchema = createInsertSchema(invoicesTable).omit({ id: true, createdAt: true });
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoicesTable.$inferSelect;
