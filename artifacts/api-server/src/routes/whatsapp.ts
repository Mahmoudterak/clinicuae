import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, whatsappTemplatesTable, whatsappMessagesTable, patientsTable } from "@workspace/db";
import { z } from "zod";
import { iso } from "../lib/serialize";

const router: IRouter = Router();

// ── helpers ───────────────────────────────────────────────────────────────────
function isoMsg(row: typeof whatsappMessagesTable.$inferSelect) {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    sentAt: row.sentAt?.toISOString() ?? null,
  };
}

function isoTpl(row: typeof whatsappTemplatesTable.$inferSelect) {
  return { ...row, createdAt: row.createdAt.toISOString() };
}

async function sendViaWhatsApp(phone: string, body: string): Promise<{ id?: string; error?: string; simulated?: boolean }> {
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  const token   = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneId || !token) {
    return { simulated: true };
  }
  try {
    const r = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone.replace(/\D/g, ""),
        type: "text",
        text: { body },
      }),
    });
    const data: any = await r.json();
    if (!r.ok) return { error: data?.error?.message ?? "WhatsApp API error" };
    return { id: data?.messages?.[0]?.id };
  } catch (e: any) {
    return { error: e.message };
  }
}

// ── Templates ─────────────────────────────────────────────────────────────────
const TemplateBody = z.object({
  name: z.string().min(1),
  nameAr: z.string().min(1),
  body: z.string().min(1),
  bodyAr: z.string().min(1),
  type: z.string().default("custom"),
  variables: z.array(z.string()).default([]),
  active: z.string().default("true"),
});

router.get("/whatsapp/templates", async (_req, res): Promise<void> => {
  const rows = await db.select().from(whatsappTemplatesTable).orderBy(desc(whatsappTemplatesTable.createdAt));
  res.json(rows.map(isoTpl));
});

router.post("/whatsapp/templates", async (req, res): Promise<void> => {
  const parsed = TemplateBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.insert(whatsappTemplatesTable).values(parsed.data).returning();
  res.status(201).json(isoTpl(row!));
});

router.patch("/whatsapp/templates/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = TemplateBody.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.update(whatsappTemplatesTable).set(parsed.data).where(eq(whatsappTemplatesTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(isoTpl(row));
});

router.delete("/whatsapp/templates/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(whatsappTemplatesTable).where(eq(whatsappTemplatesTable.id, id));
  res.sendStatus(204);
});

// ── Messages ──────────────────────────────────────────────────────────────────
const SendBody = z.object({
  patientId: z.number().optional().nullable(),
  patientPhone: z.string().min(1),
  patientName: z.string().min(1),
  templateId: z.number().optional().nullable(),
  body: z.string().min(1),
});

router.get("/whatsapp/messages", async (_req, res): Promise<void> => {
  const rows = await db.select().from(whatsappMessagesTable).orderBy(desc(whatsappMessagesTable.createdAt));
  res.json(rows.map(isoMsg));
});

router.post("/whatsapp/messages/send", async (req, res): Promise<void> => {
  const parsed = SendBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { patientId, patientPhone, patientName, templateId, body } = parsed.data;
  const result = await sendViaWhatsApp(patientPhone, body);

  const status = result.simulated ? "simulated" : result.error ? "failed" : "sent";
  const [row] = await db.insert(whatsappMessagesTable).values({
    patientId: patientId ?? null,
    patientPhone,
    patientName,
    templateId: templateId ?? null,
    body,
    status,
    waMessageId: result.id ?? null,
    errorMessage: result.error ?? null,
    sentAt: status !== "failed" ? new Date() : null,
  }).returning();

  res.status(201).json({ ...isoMsg(row!), simulated: result.simulated ?? false });
});

// Bulk send to all patients with a given template
router.post("/whatsapp/messages/bulk", async (req, res): Promise<void> => {
  const parsed = z.object({ templateId: z.number(), lang: z.enum(["en","ar"]).default("ar") }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [tpl] = await db.select().from(whatsappTemplatesTable).where(eq(whatsappTemplatesTable.id, parsed.data.templateId));
  if (!tpl) { res.status(404).json({ error: "Template not found" }); return; }

  const patients = await db.select().from(patientsTable).where(eq(patientsTable.status, "active"));
  const msgBody = parsed.data.lang === "ar" ? tpl.bodyAr : tpl.body;

  let sent = 0, failed = 0;
  for (const p of patients) {
    if (!p.phone) continue;
    const result = await sendViaWhatsApp(p.phone, msgBody);
    const status = result.simulated ? "simulated" : result.error ? "failed" : "sent";
    await db.insert(whatsappMessagesTable).values({
      patientId: p.id,
      patientPhone: p.phone,
      patientName: `${p.firstName} ${p.lastName}`,
      templateId: tpl.id,
      body: msgBody,
      status,
      waMessageId: result.id ?? null,
      errorMessage: result.error ?? null,
      sentAt: status !== "failed" ? new Date() : null,
    });
    status === "failed" ? failed++ : sent++;
  }

  res.json({ sent, failed, total: patients.filter(p => p.phone).length });
});

export default router;
