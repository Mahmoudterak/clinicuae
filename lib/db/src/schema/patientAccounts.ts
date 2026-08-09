import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { patientsTable } from "./patients";

export const patientAccountsTable = pgTable("patient_accounts", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patientsTable.id, { onDelete: "cascade" }),
  phone: text("phone").notNull().unique(),   // login identifier
  pinHash: text("pin_hash").notNull(),       // scrypt hash of 4-6 digit PIN
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PatientAccount = typeof patientAccountsTable.$inferSelect;
