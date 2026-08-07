import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, zapierWebhooksTable, zapierLogsTable } from "@workspace/db";
import { z } from "zod";
import { adminAuth } from "../middlewares/adminAuth";

const router: IRouter = Router();

function isoWebhook(row: typeof zapierWebhooksTable.$inferSelect) {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    lastFiredAt: row.lastFiredAt?.toISOString() ?? null,
  };
}

function isoLog(row: typeof zapierLogsTable.$inferSelect) {
  return { ...row, createdAt: row.createdAt.toISOString() };
}

// Available event types
export const ZAPIER_EVENTS = [
  { value: "new_patient",     label: "مريض جديد",          labelEn: "New Patient" },
  { value: "new_appointment", label: "موعد جديد",           labelEn: "New Appointment" },
  { value: "new_invoice",     label: "فاتورة جديدة",        labelEn: "New Invoice" },
  { value: "invoice_paid",    label: "فاتورة مدفوعة",       labelEn: "Invoice Paid" },
  { value: "new_booking",     label: "حجز إلكتروني جديد",   labelEn: "New Online Booking" },
];

/** Validate that a webhook URL is a legitimate Zapier catch-hook (SSRF guard). */
function isZapierUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname === "hooks.zapier.com";
  } catch {
    return false;
  }
}

const WebhookBody = z.object({
  name: z.string().min(1),
  event: z.string().min(1),
  webhookUrl: z.string().url().refine(isZapierUrl, {
    message: "Webhook URL must be a valid Zapier catch-hook (https://hooks.zapier.com/...)",
  }),
  active: z.boolean().optional(),
  description: z.string().optional().nullable(),
});

const UpdateWebhookBody = z.object({
  name: z.string().min(1).optional(),
  event: z.string().min(1).optional(),
  webhookUrl: z.string().url().refine(isZapierUrl, {
    message: "Webhook URL must be a valid Zapier catch-hook (https://hooks.zapier.com/...)",
  }).optional(),
  active: z.boolean().optional(),
  description: z.string().optional().nullable(),
});

// ── internal helper: fire a webhook ──────────────────────────────────────────
export async function fireZapierWebhook(event: string, payload: Record<string, unknown>) {
  try {
    const hooks = await db
      .select()
      .from(zapierWebhooksTable)
      .where(eq(zapierWebhooksTable.event, event));

    for (const hook of hooks) {
      if (!hook.active) continue;
      // SSRF guard: only fire to verified Zapier hook URLs
      if (!isZapierUrl(hook.webhookUrl)) continue;

      let success = false;
      let statusCode = "";
      try {
        const res = await fetch(hook.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() }),
          signal: AbortSignal.timeout(8000),
        });
        success = res.ok;
        statusCode = String(res.status);
      } catch (e: any) {
        statusCode = "error";
      }
      // fire-and-forget logs + update lastFiredAt
      db.insert(zapierLogsTable).values({
        webhookId: hook.id,
        event,
        payload: JSON.stringify(payload),
        statusCode,
        success,
      }).catch(() => {});
      db.update(zapierWebhooksTable)
        .set({ lastFiredAt: new Date() })
        .where(eq(zapierWebhooksTable.id, hook.id))
        .catch(() => {});
    }
  } catch (_) {}
}

// ── list events (public — non-sensitive metadata) ─────────────────────────────
router.get("/zapier/events", (_req, res): void => {
  res.json(ZAPIER_EVENTS);
});

// ── all routes below require a valid admin JWT ────────────────────────────────

// ── list webhooks ─────────────────────────────────────────────────────────────
router.get("/zapier/webhooks", adminAuth, async (_req, res): Promise<void> => {
  const rows = await db.select().from(zapierWebhooksTable).orderBy(desc(zapierWebhooksTable.createdAt));
  res.json(rows.map(isoWebhook));
});

// ── create webhook ────────────────────────────────────────────────────────────
router.post("/zapier/webhooks", adminAuth, async (req, res): Promise<void> => {
  const parsed = WebhookBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.insert(zapierWebhooksTable).values(parsed.data).returning();
  res.status(201).json(isoWebhook(row!));
});

// ── update webhook ────────────────────────────────────────────────────────────
router.patch("/zapier/webhooks/:id", adminAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateWebhookBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.update(zapierWebhooksTable).set(parsed.data).where(eq(zapierWebhooksTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(isoWebhook(row));
});

// ── delete webhook ────────────────────────────────────────────────────────────
router.delete("/zapier/webhooks/:id", adminAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(zapierWebhooksTable).where(eq(zapierWebhooksTable.id, id));
  res.sendStatus(204);
});

// ── test-fire webhook ─────────────────────────────────────────────────────────
router.post("/zapier/webhooks/:id/test", adminAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [hook] = await db.select().from(zapierWebhooksTable).where(eq(zapierWebhooksTable.id, id));
  if (!hook) { res.status(404).json({ error: "Not found" }); return; }

  const samplePayload: Record<string, Record<string, unknown>> = {
    new_patient:     { id: 99, firstName: "أحمد", lastName: "العتيبي", phone: "+971501234567", gender: "male" },
    new_appointment: { id: 99, patientName: "أحمد العتيبي", doctorName: "د. محمد الفارسي", date: new Date().toISOString().split("T")[0], time: "10:00", status: "scheduled" },
    new_invoice:     { id: 99, patientName: "أحمد العتيبي", amount: 350, status: "pending", description: "استشارة طبية" },
    invoice_paid:    { id: 99, patientName: "أحمد العتيبي", amount: 350, paidDate: new Date().toISOString() },
    new_booking:     { id: 99, patientName: "أحمد العتيبي", patientPhone: "+971501234567", preferredDate: new Date().toISOString().split("T")[0], preferredTime: "10:00", status: "pending" },
  };

  // SSRF guard: only fire to verified Zapier hook URLs
  if (!isZapierUrl(hook.webhookUrl)) {
    res.status(400).json({ error: "Webhook URL is not a valid Zapier catch-hook" });
    return;
  }

  let success = false;
  let statusCode = "";
  try {
    const testData = samplePayload[hook.event] ?? { message: "test" };
    const r = await fetch(hook.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: hook.event, data: testData, timestamp: new Date().toISOString(), test: true }),
      signal: AbortSignal.timeout(8000),
    });
    success = r.ok;
    statusCode = String(r.status);
  } catch (e: any) {
    statusCode = "error: " + e.message;
  }

  await db.insert(zapierLogsTable).values({
    webhookId: hook.id,
    event: hook.event,
    payload: JSON.stringify({ test: true }),
    statusCode,
    success,
  });

  res.json({ success, statusCode });
});

// ── list logs ─────────────────────────────────────────────────────────────────
router.get("/zapier/logs", adminAuth, async (_req, res): Promise<void> => {
  const rows = await db.select().from(zapierLogsTable).orderBy(desc(zapierLogsTable.createdAt)).limit(100);
  res.json(rows.map(isoLog));
});

export default router;
