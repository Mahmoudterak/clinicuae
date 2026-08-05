import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, prescriptionsTable, patientsTable, doctorsTable } from "@workspace/db";
import {
  ListPrescriptionsQueryParams,
  ListPrescriptionsResponse,
  CreatePrescriptionBody,
  CreatePrescriptionResponse,
  DeletePrescriptionParams,
} from "@workspace/api-zod";
import { iso } from "../lib/serialize";

const router: IRouter = Router();

async function withNames(rows: (typeof prescriptionsTable.$inferSelect)[]) {
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

router.get("/prescriptions", async (req, res): Promise<void> => {
  const query = ListPrescriptionsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const rows = await db
    .select()
    .from(prescriptionsTable)
    .where(query.data.patientId !== undefined ? eq(prescriptionsTable.patientId, query.data.patientId) : undefined)
    .orderBy(desc(prescriptionsTable.createdAt));
  res.json(ListPrescriptionsResponse.parse(await withNames(rows)));
});

router.post("/prescriptions", async (req, res): Promise<void> => {
  const parsed = CreatePrescriptionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(prescriptionsTable).values(parsed.data).returning();
  const [withName] = await withNames([row!]);
  res.status(201).json(CreatePrescriptionResponse.parse(withName));
});

router.delete("/prescriptions/:id", async (req, res): Promise<void> => {
  const params = DeletePrescriptionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .delete(prescriptionsTable)
    .where(eq(prescriptionsTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Prescription not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
