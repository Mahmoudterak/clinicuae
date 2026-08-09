import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const zapierWebhooksTable = pgTable("zapier_webhooks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  event: text("event").notNull(), // new_patient | new_appointment | new_invoice | invoice_paid | new_booking
  webhookUrl: text("webhook_url").notNull(),
  active: boolean("active").notNull().default(true),
  description: text("description"),
  lastFiredAt: timestamp("last_fired_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const zapierLogsTable = pgTable("zapier_logs", {
  id: serial("id").primaryKey(),
  webhookId: serial("webhook_id").notNull(),
  event: text("event").notNull(),
  payload: text("payload"),
  statusCode: text("status_code"),
  success: boolean("success").notNull().default(false),
  /** Number of delivery attempts made (0 = first attempt succeeded or failed with no retries) */
  retryCount: integer("retry_count").notNull().default(0),
  /** 'success' | 'failed' | 'retried_success' — set after all attempts are exhausted */
  finalOutcome: text("final_outcome"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertZapierWebhookSchema = createInsertSchema(zapierWebhooksTable).omit({ id: true, createdAt: true, lastFiredAt: true });
export type ZapierWebhook = typeof zapierWebhooksTable.$inferSelect;
export type InsertZapierWebhook = z.infer<typeof insertZapierWebhookSchema>;
