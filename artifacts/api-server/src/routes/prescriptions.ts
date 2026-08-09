import { Router, type IRouter } from "express";
import { eq, and, desc, type SQL } from "drizzle-orm";
import { db, prescriptionsTable, patientsTable, doctorsTable } from "@workspace/db";
import { requireClinic } from "../middlewares/adminAuth";
import {
  ListPrescriptionsQueryParams,
  ListPrescriptionsResponse,
  CreatePrescriptionBody,
  CreatePrescriptionResponse,
  DeletePrescriptionParams,
} from "@workspace/api-zod";
import { iso } from "../lib/serialize";

const router: IRouter = Router();
router.use(requireClinic);

async function withNames(rows: (typeof prescriptionsTable.$inferSelect)[], clinicId: number) {
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

router.get("/prescriptions", async (req, res): Promise<void> => {
  const query = ListPrescriptionsQueryParams.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: query.error.message }); return; }
  const cid = req.clinicId!;
  const filters: SQL[] = [eq(prescriptionsTable.clinicId, cid)];
  if (query.data.patientId !== undefined) filters.push(eq(prescriptionsTable.patientId, query.data.patientId));
  if (query.data.doctorId !== undefined) filters.push(eq(prescriptionsTable.doctorId, query.data.doctorId));
  const rows = await db
    .select()
    .from(prescriptionsTable)
    .where(and(...filters))
    .orderBy(desc(prescriptionsTable.createdAt));
  res.json(ListPrescriptionsResponse.parse(await withNames(rows, cid)));
});

router.post("/prescriptions", async (req, res): Promise<void> => {
  const parsed = CreatePrescriptionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const cid = req.clinicId!;
  const [row] = await db
    .insert(prescriptionsTable)
    .values({ ...parsed.data, clinicId: cid })
    .returning();
  const [withName] = await withNames([row!], cid);
  res.status(201).json(CreatePrescriptionResponse.parse(withName));
});

router.delete("/prescriptions/:id", async (req, res): Promise<void> => {
  const params = DeletePrescriptionParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [row] = await db
    .delete(prescriptionsTable)
    .where(and(eq(prescriptionsTable.clinicId, req.clinicId!), eq(prescriptionsTable.id, params.data.id)))
    .returning();
  if (!row) { res.status(404).json({ error: "Prescription not found" }); return; }
  res.sendStatus(204);
});

export default router;
