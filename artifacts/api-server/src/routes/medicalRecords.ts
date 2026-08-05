import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, medicalRecordsTable, patientsTable, doctorsTable } from "@workspace/db";
import {
  ListMedicalRecordsQueryParams,
  ListMedicalRecordsResponse,
  CreateMedicalRecordBody,
  CreateMedicalRecordResponse,
  UpdateMedicalRecordParams,
  UpdateMedicalRecordBody,
  UpdateMedicalRecordResponse,
  DeleteMedicalRecordParams,
} from "@workspace/api-zod";
import { iso } from "../lib/serialize";

const router: IRouter = Router();

async function withNames(rows: (typeof medicalRecordsTable.$inferSelect)[]) {
  const patients = await db.select().from(patientsTable);
  const doctors = await db.select().from(doctorsTable);
  const pMap = new Map(patients.map((p) => [p.id, `${p.firstName} ${p.lastName}`]));
  const dMap = new Map(doctors.map((d) => [d.id, `${d.firstName} ${d.lastName}`]));
  return rows.map((r) => ({
    ...iso(r),
    patientName: pMap.get(r.patientId) ?? null,
    doctorName: dMap.get(r.doctorId) ?? null,
  }));
}

router.get("/medical-records", async (req, res): Promise<void> => {
  const query = ListMedicalRecordsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const rows = await db
    .select()
    .from(medicalRecordsTable)
    .where(query.data.patientId !== undefined ? eq(medicalRecordsTable.patientId, query.data.patientId) : undefined)
    .orderBy(desc(medicalRecordsTable.visitDate));
  res.json(ListMedicalRecordsResponse.parse(await withNames(rows)));
});

router.post("/medical-records", async (req, res): Promise<void> => {
  const parsed = CreateMedicalRecordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(medicalRecordsTable).values(parsed.data).returning();
  const [withName] = await withNames([row!]);
  res.status(201).json(CreateMedicalRecordResponse.parse(withName));
});

router.patch("/medical-records/:id", async (req, res): Promise<void> => {
  const params = UpdateMedicalRecordParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateMedicalRecordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .update(medicalRecordsTable)
    .set(parsed.data)
    .where(eq(medicalRecordsTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Record not found" });
    return;
  }
  const [withName] = await withNames([row]);
  res.json(UpdateMedicalRecordResponse.parse(withName));
});

router.delete("/medical-records/:id", async (req, res): Promise<void> => {
  const params = DeleteMedicalRecordParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .delete(medicalRecordsTable)
    .where(eq(medicalRecordsTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Record not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
