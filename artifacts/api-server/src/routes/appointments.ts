import { Router, type IRouter } from "express";
import { eq, and, desc, type SQL } from "drizzle-orm";
import { db, appointmentsTable, patientsTable, doctorsTable } from "@workspace/db";
import { requireClinic } from "../middlewares/adminAuth";
import { fireZapierWebhook } from "./zapier";
import {
  ListAppointmentsQueryParams,
  ListAppointmentsResponse,
  CreateAppointmentBody,
  CreateAppointmentResponse,
  UpdateAppointmentParams,
  UpdateAppointmentBody,
  UpdateAppointmentResponse,
  DeleteAppointmentParams,
} from "@workspace/api-zod";
import { iso } from "../lib/serialize";

const router: IRouter = Router();
router.use(requireClinic);

async function withNames(rows: (typeof appointmentsTable.$inferSelect)[], clinicId: number) {
  const [patients, doctors] = await Promise.all([
    db.select().from(patientsTable).where(eq(patientsTable.clinicId, clinicId)),
    db.select().from(doctorsTable).where(eq(doctorsTable.clinicId, clinicId)),
  ]);
  const pMap = new Map(patients.map((p) => [p.id, `${p.firstName} ${p.lastName}`]));
  const dMap = new Map(doctors.map((d) => [d.id, `${d.firstName} ${d.lastName}`]));
  return rows.map((a) => ({
    ...iso(a),
    patientName: pMap.get(a.patientId) ?? null,
    doctorName: dMap.get(a.doctorId) ?? null,
  }));
}

router.get("/appointments", async (req, res): Promise<void> => {
  const query = ListAppointmentsQueryParams.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: query.error.message }); return; }
  const cid = req.clinicId!;
  const filters: SQL[] = [eq(appointmentsTable.clinicId, cid)];
  if (query.data.date) filters.push(eq(appointmentsTable.date, query.data.date));
  if (query.data.doctorId !== undefined) filters.push(eq(appointmentsTable.doctorId, query.data.doctorId));
  if (query.data.patientId !== undefined) filters.push(eq(appointmentsTable.patientId, query.data.patientId));
  if (query.data.status) filters.push(eq(appointmentsTable.status, query.data.status));
  const rows = await db
    .select()
    .from(appointmentsTable)
    .where(and(...filters))
    .orderBy(desc(appointmentsTable.date), appointmentsTable.time);
  res.json(ListAppointmentsResponse.parse(await withNames(rows, cid)));
});

router.post("/appointments", async (req, res): Promise<void> => {
  const parsed = CreateAppointmentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const cid = req.clinicId!;
  const [row] = await db
    .insert(appointmentsTable)
    .values({ ...parsed.data, clinicId: cid })
    .returning();
  if (!row) { res.status(500).json({ error: "Failed to create appointment" }); return; }
  if (parsed.data.status === "completed") void fireZapierWebhook("appointment.completed", iso(row) as Record<string, unknown>, cid);
  const [withName] = await withNames([row], cid);
  res.status(201).json(CreateAppointmentResponse.parse(withName));
});

router.put("/appointments/:id", async (req, res): Promise<void> => {
  const params = UpdateAppointmentParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateAppointmentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const cid = req.clinicId!;
  const [row] = await db
    .update(appointmentsTable)
    .set(parsed.data)
    .where(and(eq(appointmentsTable.clinicId, cid), eq(appointmentsTable.id, params.data.id)))
    .returning();
  if (!row) { res.status(404).json({ error: "Appointment not found" }); return; }
  if (parsed.data.status === "completed") void fireZapierWebhook("appointment.completed", iso(row) as Record<string, unknown>, cid);
  const [withName] = await withNames([row], cid);
  res.json(UpdateAppointmentResponse.parse(withName));
});

router.patch("/appointments/:id", async (req, res): Promise<void> => {
  const params = UpdateAppointmentParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateAppointmentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const cid = req.clinicId!;
  const [row] = await db
    .update(appointmentsTable)
    .set(parsed.data)
    .where(and(eq(appointmentsTable.clinicId, cid), eq(appointmentsTable.id, params.data.id)))
    .returning();
  if (!row) { res.status(404).json({ error: "Appointment not found" }); return; }
  if (parsed.data.status === "completed") void fireZapierWebhook("appointment.completed", iso(row) as Record<string, unknown>, cid);
  const [withName] = await withNames([row], cid);
  res.json(UpdateAppointmentResponse.parse(withName));
});

router.delete("/appointments/:id", async (req, res): Promise<void> => {
  const params = DeleteAppointmentParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [row] = await db
    .delete(appointmentsTable)
    .where(and(eq(appointmentsTable.clinicId, req.clinicId!), eq(appointmentsTable.id, params.data.id)))
    .returning();
  if (!row) { res.status(404).json({ error: "Appointment not found" }); return; }
  res.sendStatus(204);
});

export default router;
