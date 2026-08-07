import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const registeredClinicsTable = pgTable("registered_clinics", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ownerName: text("owner_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  specialty: text("specialty"),
  // plan: trial | starter | pro | medical_center
  plan: text("plan").notNull().default("trial"),
  // status: trial | active | suspended | cancelled
  status: text("status").notNull().default("trial"),
  trialStartAt: timestamp("trial_start_at", { withTimezone: true }).defaultNow(),
  trialEndAt: timestamp("trial_end_at", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type RegisteredClinicRow = typeof registeredClinicsTable.$inferSelect;
export type InsertRegisteredClinic = typeof registeredClinicsTable.$inferInsert;
