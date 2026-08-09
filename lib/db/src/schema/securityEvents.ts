import { pgTable, serial, integer, text, boolean, timestamp, index } from "drizzle-orm/pg-core";

/**
 * Security event log — captures login attempts, suspicious activity,
 * and session events for every clinic and the platform layer.
 */
export const securityEventsTable = pgTable(
  "security_events",
  {
    id: serial("id").primaryKey(),
    /** null = platform-level event (super admin) */
    clinicId: integer("clinic_id"),
    /** The admin user id (from admin_users table), if applicable */
    adminId: integer("admin_id"),
    /**
     * Event types:
     * login_success | login_failure | logout |
     * suspicious_ip | rate_limit_hit | token_invalid |
     * password_changed | impersonation_start | impersonation_end |
     * permission_denied
     */
    eventType: text("event_type").notNull(),
    /** human-readable summary */
    description: text("description").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    /** Parsed device hint (browser / OS string) */
    device: text("device"),
    /** Whether this was a successful event (for login_success vs login_failure) */
    success: boolean("success").notNull().default(true),
    /** Extra structured detail (JSON string) */
    metadata: text("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("security_events_clinic_idx").on(t.clinicId),
    index("security_events_type_idx").on(t.eventType),
    index("security_events_ip_idx").on(t.ipAddress),
    index("security_events_created_idx").on(t.createdAt),
  ],
);

export type SecurityEvent = typeof securityEventsTable.$inferSelect;
export type InsertSecurityEvent = typeof securityEventsTable.$inferInsert;
