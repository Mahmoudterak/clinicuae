import { pgTable, text, serial, integer, timestamp, date } from "drizzle-orm/pg-core";
import { patientsTable } from "./patients";
import { doctorsTable } from "./doctors";

export const radiologyRequestsTable = pgTable("radiology_requests", {
  id: serial("id").primaryKey(),
  clinicId: integer("clinic_id"),
  patientId: integer("patient_id").notNull().references(() => patientsTable.id, { onDelete: "cascade" }),
  doctorId: integer("doctor_id").notNull().references(() => doctorsTable.id, { onDelete: "cascade" }),
  studyType: text("study_type").notNull(),
  bodyPart: text("body_part").notNull(),
  priority: text("priority").notNull().default("routine"),
  status: text("status").notNull().default("pending"),
  findings: text("findings"),
  impression: text("impression"),
  requestedDate: date("requested_date", { mode: "string" }).notNull(),
  reportDate: date("report_date", { mode: "string" }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type RadiologyRequest = typeof radiologyRequestsTable.$inferSelect;
export type InsertRadiologyRequest = typeof radiologyRequestsTable.$inferInsert;
