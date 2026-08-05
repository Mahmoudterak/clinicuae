import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";

export const departmentsTable = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  head: text("head"),
  location: text("location"),
  phone: text("phone"),
  status: text("status").notNull().default("active"),
  capacity: integer("capacity"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Department = typeof departmentsTable.$inferSelect;
export type InsertDepartment = typeof departmentsTable.$inferInsert;
