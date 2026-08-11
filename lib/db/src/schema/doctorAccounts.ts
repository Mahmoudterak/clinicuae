import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { doctorsTable } from "./doctors";
import { registeredClinicsTable } from "./registeredClinics";

export const doctorAccountsTable = pgTable("doctor_accounts", {
  id: serial("id").primaryKey(),
  clinicId: integer("clinic_id").references(() => registeredClinicsTable.id, { onDelete: "cascade" }),
  doctorId: integer("doctor_id").notNull().references(() => doctorsTable.id, { onDelete: "cascade" }),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DoctorAccount = typeof doctorAccountsTable.$inferSelect;
export type InsertDoctorAccount = typeof doctorAccountsTable.$inferInsert;
