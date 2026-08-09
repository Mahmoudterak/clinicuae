import { pgTable, text, serial, integer, timestamp, date, doublePrecision } from "drizzle-orm/pg-core";
import { departmentsTable } from "./departments";

export const staffTable = pgTable("staff", {
  id: serial("id").primaryKey(),
  clinicId: integer("clinic_id"),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").notNull(),
  departmentId: integer("department_id").references(() => departmentsTable.id, { onDelete: "set null" }),
  phone: text("phone"),
  email: text("email"),
  nationalId: text("national_id"),
  dateOfJoining: date("date_of_joining", { mode: "string" }),
  salary: doublePrecision("salary"),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Staff = typeof staffTable.$inferSelect;
export type InsertStaff = typeof staffTable.$inferInsert;
