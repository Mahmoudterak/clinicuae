import { pgTable, serial, text, timestamp, integer, boolean, jsonb, numeric } from "drizzle-orm/pg-core";

export const subscriptionPlansTable = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(), // starter | pro | medical_center | enterprise
  name: text("name").notNull(),
  nameAr: text("name_ar").notNull(),
  description: text("description"),
  monthlyPrice: numeric("monthly_price", { precision: 10, scale: 2 }).notNull().default("0"),
  annualPrice: numeric("annual_price", { precision: 10, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("AED"),
  trialDays: integer("trial_days").notNull().default(14),
  // Limits
  maxDoctors: integer("max_doctors").default(1),           // -1 = unlimited
  maxStaff: integer("max_staff").default(5),               // -1 = unlimited
  maxPatients: integer("max_patients").default(500),       // -1 = unlimited
  maxBranches: integer("max_branches").default(1),         // -1 = unlimited
  storageGb: integer("storage_gb").default(5),             // -1 = unlimited
  // Feature access (array of feature keys)
  features: jsonb("features").notNull().default('["patients","appointments","invoices","prescriptions","reports"]'),
  isActive: boolean("is_active").notNull().default(true),
  isPopular: boolean("is_popular").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SubscriptionPlanRow = typeof subscriptionPlansTable.$inferSelect;
export type InsertSubscriptionPlan = typeof subscriptionPlansTable.$inferInsert;
