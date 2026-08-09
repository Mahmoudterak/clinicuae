import { Router, type IRouter } from "express";
import { eq, and, desc, inArray, type SQL } from "drizzle-orm";
import { db, invoicesTable, patientsTable, appointmentsTable } from "@workspace/db";
import { requireClinic } from "../middlewares/adminAuth";
import { fireZapierWebhook } from "./zapier";
import {
  ListInvoicesQueryParams,
  ListInvoicesResponse,
  CreateInvoiceBody,
  CreateInvoiceResponse,
  UpdateInvoiceParams,
  UpdateInvoiceBody,
  UpdateInvoiceResponse,
  DeleteInvoiceParams,
} from "@workspace/api-zod";
import { iso } from "../lib/serialize";

const router: IRouter = Router();
router.use(requireClinic);

async function withNames(rows: (typeof invoicesTable.$inferSelect)[], clinicId: number) {
  const patients = await db.select().from(patientsTable).where(eq(patientsTable.clinicId, clinicId));
  const pMap = new Map(patients.map((p) => [p.id, `${p.firstName} ${p.lastName}`]));
  return rows.map((r) => ({ ...iso(r), patientName: pMap.get(r.patientId) ?? null }));
}

router.get("/invoices", async (req, res): Promise<void> => {
  const query = ListInvoicesQueryParams.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: query.error.message }); return; }
  const cid = req.clinicId!;
  const filters: SQL[] = [eq(invoicesTable.clinicId, cid)];
  if (query.data.patientId !== undefined) filters.push(eq(invoicesTable.patientId, query.data.patientId));
  if (query.data.status) filters.push(eq(invoicesTable.status, query.data.status));
  if (query.data.doctorId !== undefined) {
    const appts = await db
      .selectDistinct({ patientId: appointmentsTable.patientId })
      .from(appointmentsTable)
      .where(and(eq(appointmentsTable.clinicId, cid), eq(appointmentsTable.doctorId, query.data.doctorId)));
    const ids = appts.map((a) => a.patientId);
    if (ids.length === 0) { res.json([]); return; }
    filters.push(inArray(invoicesTable.patientId, ids));
  }
  const rows = await db
    .select()
    .from(invoicesTable)
    .where(and(...filters))
    .orderBy(desc(invoicesTable.issuedDate));
  res.json(ListInvoicesResponse.parse(await withNames(rows, cid)));
});

router.post("/invoices", async (req, res): Promise<void> => {
  const parsed = CreateInvoiceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const cid = req.clinicId!;
  const [row] = await db
    .insert(invoicesTable)
    .values({ ...parsed.data, clinicId: cid })
    .returning();
  void fireZapierWebhook("invoice.created", row!, cid);
  const [withName] = await withNames([row!], cid);
  res.status(201).json(CreateInvoiceResponse.parse(withName));
});

router.patch("/invoices/:id", async (req, res): Promise<void> => {
  const params = UpdateInvoiceParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateInvoiceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const cid = req.clinicId!;
  const [row] = await db
    .update(invoicesTable)
    .set(parsed.data)
    .where(and(eq(invoicesTable.clinicId, cid), eq(invoicesTable.id, params.data.id)))
    .returning();
  if (!row) { res.status(404).json({ error: "Invoice not found" }); return; }
  if (parsed.data.status === "paid") void fireZapierWebhook("invoice.paid", row, cid);
  const [withName] = await withNames([row], cid);
  res.json(UpdateInvoiceResponse.parse(withName));
});

router.delete("/invoices/:id", async (req, res): Promise<void> => {
  const params = DeleteInvoiceParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [row] = await db
    .delete(invoicesTable)
    .where(and(eq(invoicesTable.clinicId, req.clinicId!), eq(invoicesTable.id, params.data.id)))
    .returning();
  if (!row) { res.status(404).json({ error: "Invoice not found" }); return; }
  res.sendStatus(204);
});

export default router;
