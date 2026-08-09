import { pgTable, serial, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";

export const platformAuditLogsTable = pgTable("platform_audit_logs", {
  id: serial("id").primaryKey(),
  actorId: integer("actor_id"),
  actorUsername: text("actor_username"),
  actorName: text("actor_name"),
  action: text("action").notNull(), // login | logout | clinic.create | clinic.suspend | clinic.delete | plan.change | impersonate | feature_flag.toggle | settings.update | ...
  resourceType: text("resource_type"), // clinic | user | plan | feature_flag | setting
  resourceId: text("resource_id"),
  resourceLabel: text("resource_label"),
  tenantId: integer("tenant_id"),
  tenantName: text("tenant_name"),
  ip: text("ip"),
  userAgent: text("user_agent"),
  previousValue: jsonb("previous_value"),
  newValue: jsonb("new_value"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PlatformAuditLogRow = typeof platformAuditLogsTable.$inferSelect;
export type InsertPlatformAuditLog = typeof platformAuditLogsTable.$inferInsert;
