import { pgTable, text, serial, integer, timestamp, date, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { patientsTable } from "./patients";
import { doctorsTable } from "./doctors";

export const appointmentsTable = pgTable(
  "appointments",
  {
    id: serial("id").primaryKey(),
    clinicId: integer("clinic_id"),
    patientId: integer("patient_id")
      .notNull()
      .references(() => patientsTable.id, { onDelete: "cascade" }),
    doctorId: integer("doctor_id")
      .notNull()
      .references(() => doctorsTable.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    time: text("time").notNull(),
    durationMinutes: integer("duration_minutes").default(30),
    status: text("status").notNull().default("scheduled"),
    reason: text("reason").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("appointments_date_idx").on(t.date), index("appointments_patient_idx").on(t.patientId)],
);

export const insertAppointmentSchema = createInsertSchema(appointmentsTable).omit({ id: true, createdAt: true });
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointmentsTable.$inferSelect;
