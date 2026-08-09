import { Router, type IRouter } from "express";
import { eq, ilike, or, and, desc } from "drizzle-orm";
import {
  db,
  patientsTable,
  appointmentsTable,
  medicalRecordsTable,
  prescriptionsTable,
  invoicesTable,
  doctorsTable,
} from "@workspace/db";
import { requireClinic } from "../middlewares/adminAuth";
import { fireZapierWebhook } from "./zapier";
import {
  ListPatientsQueryParams,
  ListPatientsResponse,
  CreatePatientBody,
  CreatePatientResponse,
  GetPatientParams,
  GetPatientResponse,
  UpdatePatientParams,
  UpdatePatientBody,
  UpdatePatientResponse,
  DeletePatientParams,
  GetPatientSummaryParams,
  GetPatientSummaryResponse,
} from "@workspace/api-zod";
import { iso } from "../lib/serialize";

const router: IRouter = Router();
// ─── All patient routes require a valid clinic-scoped token ───────────────────
router.use(requireClinic);

router.get("/patients", async (req, res): Promise<void> => {
  const query = ListPatientsQueryParams.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: query.error.message }); return; }
  const search = query.data.search?.trim();
  const cid = req.clinicId!;
  const rows = await db
    .select()
    .from(patientsTable)
    .where(
      and(
        eq(patientsTable.clinicId, cid),
        search
          ? or(
              ilike(patientsTable.firstName, `%${search}%`),
              ilike(patientsTable.lastName, `%${search}%`),
              ilike(patientsTable.phone, `%${search}%`),
            )
          : undefined,
      ),
    )
    .orderBy(desc(patientsTable.createdAt));
  res.json(ListPatientsResponse.parse(rows.map(iso)));
});

router.post("/patients", async (req, res): Promise<void> => {
  const parsed = CreatePatientBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db
    .insert(patientsTable)
    .values({ ...parsed.data, clinicId: req.clinicId })
    .returning();
  void fireZapierWebhook("patient.created", row!, req.clinicId!);
  res.status(201).json(CreatePatientResponse.parse(iso(row!)));
});

router.get("/patients/:id", async (req, res): Promise<void> => {
  const params = GetPatientParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [row] = await db
    .select()
    .from(patientsTable)
    .where(and(eq(patientsTable.clinicId, req.clinicId!), eq(patientsTable.id, params.data.id)));
  if (!row) { res.status(404).json({ error: "Patient not found" }); return; }
  res.json(GetPatientResponse.parse(iso(row)));
});

router.patch("/patients/:id", async (req, res): Promise<void> => {
  const params = UpdatePatientParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdatePatientBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db
    .update(patientsTable)
    .set(parsed.data)
    .where(and(eq(patientsTable.clinicId, req.clinicId!), eq(patientsTable.id, params.data.id)))
    .returning();
  if (!row) { res.status(404).json({ error: "Patient not found" }); return; }
  res.json(UpdatePatientResponse.parse(iso(row)));
});

router.delete("/patients/:id", async (req, res): Promise<void> => {
  const params = DeletePatientParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [row] = await db
    .delete(patientsTable)
    .where(and(eq(patientsTable.clinicId, req.clinicId!), eq(patientsTable.id, params.data.id)))
    .returning();
  if (!row) { res.status(404).json({ error: "Patient not found" }); return; }
  res.sendStatus(204);
});

router.get("/patients/:id/summary", async (req, res): Promise<void> => {
  const params = GetPatientSummaryParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const cid = req.clinicId!;
  const id = params.data.id;

  const [patient] = await db
    .select()
    .from(patientsTable)
    .where(and(eq(patientsTable.clinicId, cid), eq(patientsTable.id, id)));
  if (!patient) { res.status(404).json({ error: "Patient not found" }); return; }

  const appointments = await db
    .select({ appointment: appointmentsTable, doctorFirst: doctorsTable.firstName, doctorLast: doctorsTable.lastName })
    .from(appointmentsTable)
    .leftJoin(doctorsTable, eq(appointmentsTable.doctorId, doctorsTable.id))
    .where(and(eq(appointmentsTable.clinicId, cid), eq(appointmentsTable.patientId, id)))
    .orderBy(desc(appointmentsTable.date));

  const records = await db
    .select({ record: medicalRecordsTable, doctorFirst: doctorsTable.firstName, doctorLast: doctorsTable.lastName })
    .from(medicalRecordsTable)
    .leftJoin(doctorsTable, eq(medicalRecordsTable.doctorId, doctorsTable.id))
    .where(and(eq(medicalRecordsTable.clinicId, cid), eq(medicalRecordsTable.patientId, id)))
    .orderBy(desc(medicalRecordsTable.visitDate));

  const prescriptions = await db
    .select({ prescription: prescriptionsTable, doctorFirst: doctorsTable.firstName, doctorLast: doctorsTable.lastName })
    .from(prescriptionsTable)
    .leftJoin(doctorsTable, eq(prescriptionsTable.doctorId, doctorsTable.id))
    .where(and(eq(prescriptionsTable.clinicId, cid), eq(prescriptionsTable.patientId, id)))
    .orderBy(desc(prescriptionsTable.createdAt));

  const allInvoices = await db
    .select()
    .from(invoicesTable)
    .where(and(eq(invoicesTable.clinicId, cid), eq(invoicesTable.patientId, id)))
    .orderBy(desc(invoicesTable.issuedDate));

  res.json(
    GetPatientSummaryResponse.parse({
      patient: iso(patient),
      appointments: appointments.map(({ appointment, doctorFirst, doctorLast }) => ({
        ...iso(appointment),
        doctorName: doctorFirst && doctorLast ? `${doctorFirst} ${doctorLast}` : null,
      })),
      medicalRecords: records.map(({ record, doctorFirst, doctorLast }) => ({
        ...iso(record),
        doctorName: doctorFirst && doctorLast ? `${doctorFirst} ${doctorLast}` : null,
      })),
      prescriptions: prescriptions.map(({ prescription, doctorFirst, doctorLast }) => ({
        ...iso(prescription),
        doctorName: doctorFirst && doctorLast ? `${doctorFirst} ${doctorLast}` : null,
      })),
      invoices: allInvoices.map(iso),
    }),
  );
});

export default router;
