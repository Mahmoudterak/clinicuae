import { Router, type IRouter } from "express";
import { eq, and, desc, type SQL } from "drizzle-orm";
import { db, radiologyRequestsTable, patientsTable, doctorsTable } from "@workspace/db";
import {
  ListRadiologyRequestsQueryParams,
  ListRadiologyRequestsResponse,
  CreateRadiologyRequestBody,
  CreateRadiologyRequestResponse,
  UpdateRadiologyRequestParams,
  UpdateRadiologyRequestBody,
  UpdateRadiologyRequestResponse,
  DeleteRadiologyRequestParams,
} from "@workspace/api-zod";
import { iso } from "../lib/serialize";

const router: IRouter = Router();

async function withNames(rows: (typeof radiologyRequestsTable.$inferSelect)[]) {
  const [patients, doctors] = await Promise.all([
    db.select().from(patientsTable),
    db.select().from(doctorsTable),
  ]);
  const pMap = new Map(patients.map((p) => [p.id, `${p.firstName} ${p.lastName}`]));
  const dMap = new Map(doctors.map((d) => [d.id, `${d.firstName} ${d.lastName}`]));
  return rows.map((r) => ({ ...iso(r), patientName: pMap.get(r.patientId) ?? null, doctorName: dMap.get(r.doctorId) ?? null }));
}

router.get("/radiology-requests", async (req, res): Promise<void> => {
  const query = ListRadiologyRequestsQueryParams.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: query.error.message }); return; }
  const filters: SQL[] = [];
  if (query.data.patientId !== undefined) filters.push(eq(radiologyRequestsTable.patientId, query.data.patientId));
  if (query.data.doctorId !== undefined) filters.push(eq(radiologyRequestsTable.doctorId, query.data.doctorId));
  if (query.data.status) filters.push(eq(radiologyRequestsTable.status, query.data.status));
  const rows = await db.select().from(radiologyRequestsTable).where(filters.length ? and(...filters) : undefined).orderBy(desc(radiologyRequestsTable.createdAt));
  res.json(ListRadiologyRequestsResponse.parse(await withNames(rows)));
});

router.post("/radiology-requests", async (req, res): Promise<void> => {
  const parsed = CreateRadiologyRequestBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.insert(radiologyRequestsTable).values(parsed.data).returning();
  const [r] = await withNames([row!]);
  res.status(201).json(CreateRadiologyRequestResponse.parse(r));
});

router.patch("/radiology-requests/:id", async (req, res): Promise<void> => {
  const params = UpdateRadiologyRequestParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateRadiologyRequestBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.update(radiologyRequestsTable).set(parsed.data).where(eq(radiologyRequestsTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  const [r] = await withNames([row]);
  res.json(UpdateRadiologyRequestResponse.parse(r));
});

router.delete("/radiology-requests/:id", async (req, res): Promise<void> => {
  const params = DeleteRadiologyRequestParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [row] = await db.delete(radiologyRequestsTable).where(eq(radiologyRequestsTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.sendStatus(204);
});

export default router;
