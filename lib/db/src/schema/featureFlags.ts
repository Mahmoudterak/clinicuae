import { pgTable, serial, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";

// Global feature flags
export const featureFlagsTable = pgTable("feature_flags", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(), // whatsapp | ai_assistant | online_payments | inventory | pharmacy | laboratory | radiology | api_access | dark_mode | online_booking | zapier
  name: text("name").notNull(),
  nameAr: text("name_ar").notNull(),
  description: text("description"),
  enabled: boolean("enabled").notNull().default(true),
  category: text("category").notNull().default("feature"), // feature | experimental | maintenance
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: text("updated_by"),
});

// Per-clinic feature flag overrides
export const clinicFeatureFlagsTable = pgTable("clinic_feature_flags", {
  id: serial("id").primaryKey(),
  clinicId: integer("clinic_id").notNull(),
  flagKey: text("flag_key").notNull(),
  enabled: boolean("enabled").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: text("updated_by"),
});

export type FeatureFlagRow = typeof featureFlagsTable.$inferSelect;
export type InsertFeatureFlag = typeof featureFlagsTable.$inferInsert;
export type ClinicFeatureFlagRow = typeof clinicFeatureFlagsTable.$inferSelect;
