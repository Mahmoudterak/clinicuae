import { pgTable, text, serial, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { patientsTable } from "./patients";
import { doctorsTable } from "./doctors";

export const prescriptionsTable = pgTable(
  "prescriptions",
  {
    id: serial("id").primaryKey(),
    clinicId: integer("clinic_id"),
    patientId: integer("patient_id")
      .notNull()
      .references(() => patientsTable.id, { onDelete: "cascade" }),
    doctorId: integer("doctor_id")
      .notNull()
      .references(() => doctorsTable.id, { onDelete: "cascade" }),
    medication: text("medication").notNull(),
    dosage: text("dosage").notNull(),
    frequency: text("frequency").notNull(),
    durationDays: integer("duration_days"),
    instructions: text("instructions"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("prescriptions_patient_idx").on(t.patientId)],
);

export const insertPrescriptionSchema = createInsertSchema(prescriptionsTable).omit({ id: true, createdAt: true });
export type InsertPrescription = z.infer<typeof insertPrescriptionSchema>;
export type Prescription = typeof prescriptionsTable.$inferSelect;
