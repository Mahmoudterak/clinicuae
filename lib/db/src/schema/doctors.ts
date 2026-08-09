import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const doctorsTable = pgTable("doctors", {
  id: serial("id").primaryKey(),
  clinicId: integer("clinic_id"),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  specialty: text("specialty").notNull(),
  phone: text("phone"),
  email: text("email"),
  department: text("department"),
  status: text("status").notNull().default("active"),
  bio: text("bio"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDoctorSchema = createInsertSchema(doctorsTable).omit({ id: true, createdAt: true });
export type InsertDoctor = z.infer<typeof insertDoctorSchema>;
export type Doctor = typeof doctorsTable.$inferSelect;
