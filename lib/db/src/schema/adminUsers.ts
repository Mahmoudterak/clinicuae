import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";

export const adminUsersTable = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  /** Links this admin to a specific clinic (null = platform/legacy admin) */
  clinicId: integer("clinic_id"),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  /** role within the clinic: owner | admin | staff */
  role: text("role").notNull().default("admin"),
  /** active | suspended */
  status: text("status").notNull().default("active"),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AdminUserRow = typeof adminUsersTable.$inferSelect;
export type InsertAdminUser = typeof adminUsersTable.$inferInsert;
