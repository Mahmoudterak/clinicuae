import { Router, type IRouter } from "express";
import { eq, and, desc, inArray, type SQL } from "drizzle-orm";
import { db, invoicesTable, patientsTable, appointmentsTable } from "@workspace/db";
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

async function withNames(rows: (typeof invoicesTable.$inferSelect)[]) {
  const patients = await db.select().from(patientsTable);
  const pMap = new Map(patients.map((p) => [p.id, `${p.firstName} ${p.lastName}`]));
  return rows.map((r) => ({ ...iso(r), patientName: pMap.get(r.patientId) ?? null }));
}

router.get("/invoices", async (req, res): Promise<void> => {
  const query = ListInvoicesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const filters: SQL[] = [];
  if (query.data.patientId !== undefined) filters.push(eq(invoicesTable.patientId, query.data.patientId));
  if (query.data.status) filters.push(eq(invoicesTable.status, query.data.status));
  // doctorId: scope to patients who have appointments with this doctor
  if (query.data.doctorId !== undefined) {
    const appts = await db
      .selectDistinct({ patientId: appointmentsTable.patientId })
      .from(appointmentsTable)
      .where(eq(appointmentsTable.doctorId, query.data.doctorId));
    const ids = appts.map((a) => a.patientId);
    if (ids.length === 0) { res.json([]); return; }
    filters.push(inArray(invoicesTable.patientId, ids));
  }
  const rows = await db
    .select()
    .from(invoicesTable)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(invoicesTable.issuedDate));
  res.json(ListInvoicesResponse.parse(await withNames(rows)));
});

router.post("/invoices", async (req, res): Promise<void> => {
  const parsed = CreateInvoiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(invoicesTable).values(parsed.data).returning();
  const [withName] = await withNames([row!]);
  res.status(201).json(CreateInvoiceResponse.parse(withName));
});

router.patch("/invoices/:id", async (req, res): Promise<void> => {
  const params = UpdateInvoiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateInvoiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .update(invoicesTable)
    .set(parsed.data)
    .where(eq(invoicesTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }
  const [withName] = await withNames([row]);
  res.json(UpdateInvoiceResponse.parse(withName));
});

router.delete("/invoices/:id", async (req, res): Promise<void> => {
  const params = DeleteInvoiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db.delete(invoicesTable).where(eq(invoicesTable.id, params.data.id)).returning();
  if (!row) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
