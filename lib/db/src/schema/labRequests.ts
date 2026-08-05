import { pgTable, text, serial, integer, timestamp, date } from "drizzle-orm/pg-core";
import { patientsTable } from "./patients";
import { doctorsTable } from "./doctors";

export const labRequestsTable = pgTable("lab_requests", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patientsTable.id, { onDelete: "cascade" }),
  doctorId: integer("doctor_id").notNull().references(() => doctorsTable.id, { onDelete: "cascade" }),
  testName: text("test_name").notNull(),
  testCode: text("test_code"),
  category: text("category").notNull().default("general"),
  priority: text("priority").notNull().default("routine"),
  status: text("status").notNull().default("pending"),
  result: text("result"),
  resultDate: date("result_date", { mode: "string" }),
  notes: text("notes"),
  requestedDate: date("requested_date", { mode: "string" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type LabRequest = typeof labRequestsTable.$inferSelect;
export type InsertLabRequest = typeof labRequestsTable.$inferInsert;
