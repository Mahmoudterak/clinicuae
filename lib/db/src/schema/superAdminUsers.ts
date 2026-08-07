import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const superAdminUsersTable = pgTable("super_admin_users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SuperAdminUserRow = typeof superAdminUsersTable.$inferSelect;
export type InsertSuperAdminUser = typeof superAdminUsersTable.$inferInsert;
