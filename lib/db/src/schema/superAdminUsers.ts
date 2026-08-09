import { pgTable, serial, text, timestamp, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const SUPER_ADMIN_ROLES = [
  "super_admin",
  "platform_admin",
  "support_admin",
  "billing_admin",
  "developer",
] as const;

export type SuperAdminRole = typeof SUPER_ADMIN_ROLES[number];

export const superAdminUsersTable = pgTable("super_admin_users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("super_admin"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check("super_admin_users_role_check", sql`${t.role} IN ('super_admin','platform_admin','support_admin','billing_admin','developer')`),
]);

export type SuperAdminUserRow = typeof superAdminUsersTable.$inferSelect;
export type InsertSuperAdminUser = typeof superAdminUsersTable.$inferInsert;
