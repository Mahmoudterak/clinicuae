import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const platformSettingsTable = pgTable("platform_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull().default(""),
  label: text("label"),
  description: text("description"),
  category: text("category").notNull().default("general"), // general | branding | email | security | maintenance | payment
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: text("updated_by"),
});

export type PlatformSettingRow = typeof platformSettingsTable.$inferSelect;
export type InsertPlatformSetting = typeof platformSettingsTable.$inferInsert;
