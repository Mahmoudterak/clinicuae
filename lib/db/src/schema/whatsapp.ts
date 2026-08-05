import { pgTable, text, serial, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { patientsTable } from "./patients";

export const whatsappTemplatesTable = pgTable("whatsapp_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameAr: text("name_ar").notNull(),
  body: text("body").notNull(),        // English template with {{vars}}
  bodyAr: text("body_ar").notNull(),   // Arabic template with {{vars}}
  type: text("type").notNull().default("custom"), // reminder | offer | custom | followup
  variables: text("variables").array().notNull().default([]),
  active: text("active").notNull().default("true"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const whatsappMessagesTable = pgTable(
  "whatsapp_messages",
  {
    id: serial("id").primaryKey(),
    patientId: integer("patient_id").references(() => patientsTable.id, { onDelete: "set null" }),
    patientPhone: text("patient_phone").notNull(),
    patientName: text("patient_name").notNull(),
    templateId: integer("template_id").references(() => whatsappTemplatesTable.id, { onDelete: "set null" }),
    body: text("body").notNull(),           // final rendered message
    status: text("status").notNull().default("pending"), // pending | sent | failed | simulated
    waMessageId: text("wa_message_id"),     // WhatsApp message ID from API
    errorMessage: text("error_message"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("wa_messages_patient_idx").on(t.patientId),
    index("wa_messages_status_idx").on(t.status),
  ]
);

export const insertWhatsappTemplateSchema = createInsertSchema(whatsappTemplatesTable).omit({ id: true, createdAt: true });
export const insertWhatsappMessageSchema = createInsertSchema(whatsappMessagesTable).omit({ id: true, createdAt: true, sentAt: true, waMessageId: true });

export type WhatsappTemplate = typeof whatsappTemplatesTable.$inferSelect;
export type WhatsappMessage = typeof whatsappMessagesTable.$inferSelect;
export type InsertWhatsappTemplate = z.infer<typeof insertWhatsappTemplateSchema>;
export type InsertWhatsappMessage = z.infer<typeof insertWhatsappMessageSchema>;
