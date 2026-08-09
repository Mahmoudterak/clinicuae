import { pgTable, text, serial, timestamp, index } from "drizzle-orm/pg-core";

export const demoRequestsTable = pgTable(
  "demo_requests",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    clinicName: text("clinic_name").notNull(),
    phone: text("phone").notNull(),
    preferredTime: text("preferred_time"),
    status: text("status").notNull().default("new"), // new | contacted | converted
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("demo_requests_status_idx").on(t.status),
    index("demo_requests_created_idx").on(t.createdAt),
  ]
);

export type DemoRequest = typeof demoRequestsTable.$inferSelect;
