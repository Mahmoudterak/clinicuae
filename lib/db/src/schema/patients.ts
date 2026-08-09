import { pgTable, text, serial, timestamp, date, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const patientsTable = pgTable("patients", {
  id: serial("id").primaryKey(),
  clinicId: integer("clinic_id"),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  gender: text("gender").notNull(),
  dateOfBirth: date("date_of_birth", { mode: "string" }),
  bloodType: text("blood_type"),
  allergies: text("allergies"),
  address: text("address"),
  notes: text("notes"),
  status: text("status").notNull().default("active"), // "active" | "inactive"
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPatientSchema = createInsertSchema(patientsTable).omit({ id: true, createdAt: true });
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Patient = typeof patientsTable.$inferSelect;
