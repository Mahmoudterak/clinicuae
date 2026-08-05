import { pgTable, text, serial, integer, timestamp, date, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { doctorsTable } from "./doctors";

export const onlineBookingsTable = pgTable(
  "online_bookings",
  {
    id: serial("id").primaryKey(),
    patientName: text("patient_name").notNull(),
    patientPhone: text("patient_phone").notNull(),
    patientEmail: text("patient_email"),
    patientAge: integer("patient_age"),
    patientGender: text("patient_gender"),
    doctorId: integer("doctor_id").references(() => doctorsTable.id, { onDelete: "set null" }),
    preferredDate: date("preferred_date", { mode: "string" }).notNull(),
    preferredTime: text("preferred_time").notNull(),
    reason: text("reason").notNull(),
    notes: text("notes"),
    status: text("status").notNull().default("pending"), // pending | confirmed | rejected | completed
    adminNotes: text("admin_notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("bookings_date_idx").on(t.preferredDate),
    index("bookings_status_idx").on(t.status),
    index("bookings_doctor_idx").on(t.doctorId),
  ]
);

export const insertOnlineBookingSchema = createInsertSchema(onlineBookingsTable).omit({ id: true, createdAt: true, adminNotes: true, status: true });
export type OnlineBooking = typeof onlineBookingsTable.$inferSelect;
export type InsertOnlineBooking = z.infer<typeof insertOnlineBookingSchema>;
