import { Router, type IRouter } from "express";
import { eq, and, desc, type SQL } from "drizzle-orm";
import { db, appointmentsTable, patientsTable, doctorsTable } from "@workspace/db";
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
import { fireZapierWebhook } from "./zapier";

const router: IRouter = Router();

async function withNames(rows: (typeof appointmentsTable.$inferSelect)[]) {
  const patients = await db.select().from(patientsTable);
  const doctors = await db.select().from(doctorsTable);
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
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const filters: SQL[] = [];
  if (query.data.date) filters.push(eq(appointmentsTable.date, query.data.date));
  if (query.data.doctorId !== undefined) filters.push(eq(appointmentsTable.doctorId, query.data.doctorId));
  if (query.data.patientId !== undefined) filters.push(eq(appointmentsTable.patientId, query.data.patientId));
  if (query.data.status) filters.push(eq(appointmentsTable.status, query.data.status));
  const rows = await db
    .select()
    .from(appointmentsTable)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(appointmentsTable.date), appointmentsTable.time);
  res.json(ListAppointmentsResponse.parse(await withNames(rows)));
});

router.post("/appointments", async (req, res): Promise<void> => {
  const parsed = CreateAppointmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(appointmentsTable).values(parsed.data).returning();
  const [withName] = await withNames([row!]);
  fireZapierWebhook("new_appointment", {
    id: withName!.id,
    patientName: withName!.patientName,
    doctorName: withName!.doctorName,
    date: withName!.date,
    time: withName!.time,
    status: withName!.status,
  });
  res.status(201).json(CreateAppointmentResponse.parse(withName));
});

router.patch("/appointments/:id", async (req, res): Promise<void> => {
  const params = UpdateAppointmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateAppointmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .update(appointmentsTable)
    .set(parsed.data)
    .where(eq(appointmentsTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Appointment not found" });
    return;
  }
  const [withName] = await withNames([row]);
  res.json(UpdateAppointmentResponse.parse(withName));
});

router.delete("/appointments/:id", async (req, res): Promise<void> => {
  const params = DeleteAppointmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .delete(appointmentsTable)
    .where(eq(appointmentsTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Appointment not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
