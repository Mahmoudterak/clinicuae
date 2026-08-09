import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";

export const clinicSettingsTable = pgTable("clinic_settings", {
  id: serial("id").primaryKey(),
  clinicId: integer("clinic_id"),
  clinicName: text("clinic_name").notNull().default("Clinic OS"),
  clinicNameAr: text("clinic_name_ar").notNull().default("كلينيك OS"),
  address: text("address").notNull().default(""),
  phone: text("phone").notNull().default(""),
  email: text("email").notNull().default(""),
  website: text("website").notNull().default(""),
  currency: text("currency").notNull().default("AED"),
  timezone: text("timezone").notNull().default("Asia/Dubai"),
  logoDataUrl: text("logo_data_url"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ClinicSettingsRow = typeof clinicSettingsTable.$inferSelect;
export type InsertClinicSettings = typeof clinicSettingsTable.$inferInsert;
