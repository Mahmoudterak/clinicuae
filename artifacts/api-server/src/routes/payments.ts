import { Router, type IRouter } from "express";
import { eq, and, desc, type SQL } from "drizzle-orm";
import { db, paymentsTable, patientsTable } from "@workspace/db";
import {
  ListPaymentsQueryParams,
  ListPaymentsResponse,
  CreatePaymentBody,
  CreatePaymentResponse,
  UpdatePaymentParams,
  UpdatePaymentBody,
  UpdatePaymentResponse,
  DeletePaymentParams,
} from "@workspace/api-zod";
import { iso } from "../lib/serialize";

const router: IRouter = Router();

async function withNames(rows: (typeof paymentsTable.$inferSelect)[]) {
  const patients = await db.select().from(patientsTable);
  const pMap = new Map(patients.map((p) => [p.id, `${p.firstName} ${p.lastName}`]));
  return rows.map((r) => ({ ...iso(r), patientName: pMap.get(r.patientId) ?? null }));
}

router.get("/payments", async (req, res): Promise<void> => {
  const query = ListPaymentsQueryParams.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: query.error.message }); return; }
  const filters: SQL[] = [];
  if (query.data.patientId !== undefined) filters.push(eq(paymentsTable.patientId, query.data.patientId));
  if (query.data.invoiceId !== undefined) filters.push(eq(paymentsTable.invoiceId, query.data.invoiceId));
  if (query.data.status) filters.push(eq(paymentsTable.status, query.data.status));
  const rows = await db.select().from(paymentsTable).where(filters.length ? and(...filters) : undefined).orderBy(desc(paymentsTable.createdAt));
  res.json(ListPaymentsResponse.parse(await withNames(rows)));
});

router.post("/payments", async (req, res): Promise<void> => {
  const parsed = CreatePaymentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.insert(paymentsTable).values(parsed.data).returning();
  const [r] = await withNames([row!]);
  res.status(201).json(CreatePaymentResponse.parse(r));
});

router.patch("/payments/:id", async (req, res): Promise<void> => {
  const params = UpdatePaymentParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdatePaymentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.update(paymentsTable).set(parsed.data).where(eq(paymentsTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  const [r] = await withNames([row]);
  res.json(UpdatePaymentResponse.parse(r));
});

router.delete("/payments/:id", async (req, res): Promise<void> => {
  const params = DeletePaymentParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [row] = await db.delete(paymentsTable).where(eq(paymentsTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.sendStatus(204);
});

export default router;
