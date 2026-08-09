import { Router, type IRouter } from "express";
import { eq, and, desc, type SQL } from "drizzle-orm";
import { db, medicalRecordsTable, patientsTable, doctorsTable } from "@workspace/db";
import { requireClinic } from "../middlewares/adminAuth";
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
router.use(requireClinic);

async function withNames(rows: (typeof medicalRecordsTable.$inferSelect)[], clinicId: number) {
  const [patients, doctors] = await Promise.all([
    db.select().from(patientsTable).where(eq(patientsTable.clinicId, clinicId)),
    db.select().from(doctorsTable).where(eq(doctorsTable.clinicId, clinicId)),
  ]);
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
  if (!query.success) { res.status(400).json({ error: query.error.message }); return; }
  const cid = req.clinicId!;
  const filters: SQL[] = [eq(medicalRecordsTable.clinicId, cid)];
  if (query.data.patientId !== undefined) filters.push(eq(medicalRecordsTable.patientId, query.data.patientId));
  if (query.data.doctorId !== undefined) filters.push(eq(medicalRecordsTable.doctorId, query.data.doctorId));
  const rows = await db
    .select()
    .from(medicalRecordsTable)
    .where(and(...filters))
    .orderBy(desc(medicalRecordsTable.visitDate));
  res.json(ListMedicalRecordsResponse.parse(await withNames(rows, cid)));
});

router.post("/medical-records", async (req, res): Promise<void> => {
  const parsed = CreateMedicalRecordBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const cid = req.clinicId!;
  const [row] = await db
    .insert(medicalRecordsTable)
    .values({ ...parsed.data, clinicId: cid })
    .returning();
  const [withName] = await withNames([row!], cid);
  res.status(201).json(CreateMedicalRecordResponse.parse(withName));
});

router.patch("/medical-records/:id", async (req, res): Promise<void> => {
  const params = UpdateMedicalRecordParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateMedicalRecordBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const cid = req.clinicId!;
  const [row] = await db
    .update(medicalRecordsTable)
    .set(parsed.data)
    .where(and(eq(medicalRecordsTable.clinicId, cid), eq(medicalRecordsTable.id, params.data.id)))
    .returning();
  if (!row) { res.status(404).json({ error: "Record not found" }); return; }
  const [withName] = await withNames([row], cid);
  res.json(UpdateMedicalRecordResponse.parse(withName));
});

router.delete("/medical-records/:id", async (req, res): Promise<void> => {
  const params = DeleteMedicalRecordParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [row] = await db
    .delete(medicalRecordsTable)
    .where(and(eq(medicalRecordsTable.clinicId, req.clinicId!), eq(medicalRecordsTable.id, params.data.id)))
    .returning();
  if (!row) { res.status(404).json({ error: "Record not found" }); return; }
  res.sendStatus(204);
});

export default router;
