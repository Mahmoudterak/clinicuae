import { Router, type IRouter } from "express";
import { eq, and, desc, type SQL } from "drizzle-orm";
import { db, insuranceTable, patientsTable } from "@workspace/db";
import {
  ListInsuranceQueryParams,
  ListInsuranceResponse,
  CreateInsuranceRecordBody,
  CreateInsuranceRecordResponse,
  UpdateInsuranceRecordParams,
  UpdateInsuranceRecordBody,
  UpdateInsuranceRecordResponse,
  DeleteInsuranceRecordParams,
} from "@workspace/api-zod";
import { iso } from "../lib/serialize";

const router: IRouter = Router();

async function withNames(rows: (typeof insuranceTable.$inferSelect)[]) {
  const patients = await db.select().from(patientsTable);
  const pMap = new Map(patients.map((p) => [p.id, `${p.firstName} ${p.lastName}`]));
  return rows.map((r) => ({ ...iso(r), patientName: pMap.get(r.patientId) ?? null }));
}

router.get("/insurance", async (req, res): Promise<void> => {
  const query = ListInsuranceQueryParams.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: query.error.message }); return; }
  const filters: SQL[] = [];
  if (query.data.patientId !== undefined) filters.push(eq(insuranceTable.patientId, query.data.patientId));
  if (query.data.status) filters.push(eq(insuranceTable.status, query.data.status));
  const rows = await db.select().from(insuranceTable).where(filters.length ? and(...filters) : undefined).orderBy(desc(insuranceTable.createdAt));
  res.json(ListInsuranceResponse.parse(await withNames(rows)));
});

router.post("/insurance", async (req, res): Promise<void> => {
  const parsed = CreateInsuranceRecordBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.insert(insuranceTable).values(parsed.data).returning();
  const [r] = await withNames([row!]);
  res.status(201).json(CreateInsuranceRecordResponse.parse(r));
});

router.patch("/insurance/:id", async (req, res): Promise<void> => {
  const params = UpdateInsuranceRecordParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateInsuranceRecordBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.update(insuranceTable).set(parsed.data).where(eq(insuranceTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  const [r] = await withNames([row]);
  res.json(UpdateInsuranceRecordResponse.parse(r));
});

router.delete("/insurance/:id", async (req, res): Promise<void> => {
  const params = DeleteInsuranceRecordParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [row] = await db.delete(insuranceTable).where(eq(insuranceTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.sendStatus(204);
});

export default router;
