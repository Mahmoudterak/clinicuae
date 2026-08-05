import { Router, type IRouter } from "express";
import { eq, and, desc, type SQL } from "drizzle-orm";
import { db, labRequestsTable, patientsTable, doctorsTable } from "@workspace/db";
import {
  ListLabRequestsQueryParams,
  ListLabRequestsResponse,
  CreateLabRequestBody,
  CreateLabRequestResponse,
  UpdateLabRequestParams,
  UpdateLabRequestBody,
  UpdateLabRequestResponse,
  DeleteLabRequestParams,
} from "@workspace/api-zod";
import { iso } from "../lib/serialize";

const router: IRouter = Router();

async function withNames(rows: (typeof labRequestsTable.$inferSelect)[]) {
  const [patients, doctors] = await Promise.all([
    db.select().from(patientsTable),
    db.select().from(doctorsTable),
  ]);
  const pMap = new Map(patients.map((p) => [p.id, `${p.firstName} ${p.lastName}`]));
  const dMap = new Map(doctors.map((d) => [d.id, `${d.firstName} ${d.lastName}`]));
  return rows.map((r) => ({ ...iso(r), patientName: pMap.get(r.patientId) ?? null, doctorName: dMap.get(r.doctorId) ?? null }));
}

router.get("/lab-requests", async (req, res): Promise<void> => {
  const query = ListLabRequestsQueryParams.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: query.error.message }); return; }
  const filters: SQL[] = [];
  if (query.data.patientId !== undefined) filters.push(eq(labRequestsTable.patientId, query.data.patientId));
  if (query.data.doctorId !== undefined) filters.push(eq(labRequestsTable.doctorId, query.data.doctorId));
  if (query.data.status) filters.push(eq(labRequestsTable.status, query.data.status));
  const rows = await db.select().from(labRequestsTable).where(filters.length ? and(...filters) : undefined).orderBy(desc(labRequestsTable.createdAt));
  res.json(ListLabRequestsResponse.parse(await withNames(rows)));
});

router.post("/lab-requests", async (req, res): Promise<void> => {
  const parsed = CreateLabRequestBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.insert(labRequestsTable).values(parsed.data).returning();
  const [r] = await withNames([row!]);
  res.status(201).json(CreateLabRequestResponse.parse(r));
});

router.patch("/lab-requests/:id", async (req, res): Promise<void> => {
  const params = UpdateLabRequestParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateLabRequestBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.update(labRequestsTable).set(parsed.data).where(eq(labRequestsTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  const [r] = await withNames([row]);
  res.json(UpdateLabRequestResponse.parse(r));
});

router.delete("/lab-requests/:id", async (req, res): Promise<void> => {
  const params = DeleteLabRequestParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [row] = await db.delete(labRequestsTable).where(eq(labRequestsTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.sendStatus(204);
});

export default router;
