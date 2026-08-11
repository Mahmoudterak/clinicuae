import { Router, type IRouter } from "express";
import { eq, desc, and, type SQL } from "drizzle-orm";
import { db, onlineBookingsTable, doctorsTable, appointmentsTable, patientsTable } from "@workspace/db";
import { requireClinic, adminAuth } from "../middlewares/adminAuth";
import { z } from "zod";
import { fireZapierWebhook } from "./zapier";
import { iso } from "../lib/serialize";

const router: IRouter = Router();

function isoBooking(row: typeof onlineBookingsTable.$inferSelect) {
  return { ...row, createdAt: row.createdAt.toISOString() };
}

async function withDoctorName(rows: (typeof onlineBookingsTable.$inferSelect)[], clinicId?: number) {
  const docs = clinicId
    ? await db.select().from(doctorsTable).where(eq(doctorsTable.clinicId, clinicId))
    : await db.select().from(doctorsTable);
  const dMap = new Map(docs.map(d => [d.id, `${d.firstName} ${d.lastName}`]));
  return rows.map(r => ({ ...isoBooking(r), doctorName: r.doctorId ? (dMap.get(r.doctorId) ?? null) : null }));
}

const CreateBookingBody = z.object({
  clinicId: z.number().int().positive().optional().nullable(),
  patientName: z.string().min(1),
  patientPhone: z.string().min(7),
  patientEmail: z.string().email().optional().nullable(),
  patientAge: z.number().int().min(0).max(150).optional().nullable(),
  patientGender: z.string().optional().nullable(),
  doctorId: z.number().int().optional().nullable(),
  preferredDate: z.string().min(1),
  preferredTime: z.string().min(1),
  reason: z.string().min(1),
  notes: z.string().optional().nullable(),
});

const UpdateBookingBody = z.object({
  status: z.enum(["pending", "confirmed", "rejected", "completed"]).optional(),
  adminNotes: z.string().optional().nullable(),
  preferredDate: z.string().optional(),
  preferredTime: z.string().optional(),
});

// ── Public routes (no auth) ───────────────────────────────────────────────────

// GET /public/doctors?clinicId=X — return active doctors for this clinic
router.get("/public/doctors", async (req, res): Promise<void> => {
  const clinicId = req.query.clinicId ? Number(req.query.clinicId) : null;
  const filters: SQL[] = [eq(doctorsTable.status, "active")];
  if (clinicId) filters.push(eq(doctorsTable.clinicId, clinicId));

  const doctors = await db.select({
    id: doctorsTable.id,
    firstName: doctorsTable.firstName,
    lastName: doctorsTable.lastName,
    specialty: doctorsTable.specialty,
    status: doctorsTable.status,
  }).from(doctorsTable).where(and(...filters));
  res.json(doctors);
});

// GET /public/booked-slots?clinicId=X&doctorId=Y&date=Z
router.get("/public/booked-slots", async (req, res): Promise<void> => {
  const { doctorId, date } = req.query as { doctorId: string; date: string };
  if (!doctorId || !date) { res.json([]); return; }

  const [appts, bookings] = await Promise.all([
    db.select({ time: appointmentsTable.time })
      .from(appointmentsTable)
      .where(and(eq(appointmentsTable.doctorId, Number(doctorId)), eq(appointmentsTable.date, date))),
    db.select({ time: onlineBookingsTable.preferredTime })
      .from(onlineBookingsTable)
      .where(and(
        eq(onlineBookingsTable.doctorId, Number(doctorId)),
        eq(onlineBookingsTable.preferredDate, date),
        eq(onlineBookingsTable.status, "confirmed"),
      )),
  ]);

  res.json([...appts.map(a => a.time), ...bookings.map(b => b.time)]);
});

// POST /public/bookings
router.post("/public/bookings", async (req, res): Promise<void> => {
  const parsed = CreateBookingBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [row] = await db
    .insert(onlineBookingsTable)
    .values({ ...parsed.data, status: "pending" })
    .returning();
  if (!row) { res.status(500).json({ error: "Failed to create booking" }); return; }

  void fireZapierWebhook("booking.created", { id: row.id, ...parsed.data }, parsed.data.clinicId ?? undefined);
  res.status(201).json(isoBooking(row));
});

// ── Admin routes (require clinic scope) ───────────────────────────────────────
const adminRouter: IRouter = Router();
adminRouter.use(requireClinic);

// GET /bookings?status=pending
adminRouter.get("/bookings", async (req, res): Promise<void> => {
  const { status } = req.query as { status?: string };
  const cid = req.clinicId!;

  const filters: SQL[] = [eq(onlineBookingsTable.clinicId, cid)];
  if (status) filters.push(eq(onlineBookingsTable.status, status));

  const rows = await db
    .select()
    .from(onlineBookingsTable)
    .where(and(...filters))
    .orderBy(desc(onlineBookingsTable.createdAt));

  res.json(await withDoctorName(rows, cid));
});

// PATCH /bookings/:id
adminRouter.patch("/bookings/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = UpdateBookingBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const cid = req.clinicId!;
  const [row] = await db
    .update(onlineBookingsTable)
    .set(parsed.data)
    .where(and(eq(onlineBookingsTable.clinicId, cid), eq(onlineBookingsTable.id, id)))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }

  const [enriched] = await withDoctorName([row], cid);
  res.json(enriched);
});

// DELETE /bookings/:id
adminRouter.delete("/bookings/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db
    .delete(onlineBookingsTable)
    .where(and(eq(onlineBookingsTable.clinicId, req.clinicId!), eq(onlineBookingsTable.id, id)));
  res.sendStatus(204);
});

// POST /bookings/:id/convert — convert booking to appointment (+ optionally create patient)
adminRouter.post("/bookings/:id/convert", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const cid = req.clinicId!;

  const [booking] = await db
    .select()
    .from(onlineBookingsTable)
    .where(and(eq(onlineBookingsTable.clinicId, cid), eq(onlineBookingsTable.id, id)))
    .limit(1);
  if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }

  // Upsert patient by phone number
  let patientId: number;
  const [existingPatient] = await db
    .select({ id: patientsTable.id })
    .from(patientsTable)
    .where(and(eq(patientsTable.clinicId, cid), eq(patientsTable.phone, booking.patientPhone)))
    .limit(1);

  if (existingPatient) {
    patientId = existingPatient.id;
  } else {
    const nameParts = booking.patientName.trim().split(/\s+/);
    const firstName = nameParts[0] ?? booking.patientName;
    const lastName = nameParts.slice(1).join(" ") || "-";
    const [newPatient] = await db
      .insert(patientsTable)
      .values({
        clinicId: cid,
        firstName,
        lastName,
        phone: booking.patientPhone,
        email: booking.patientEmail ?? undefined,
        dateOfBirth: null,
        gender: (booking.patientGender as "male" | "female" | null) ?? null,
      })
      .returning({ id: patientsTable.id });
    patientId = newPatient!.id;
  }

  // Create appointment
  const [appt] = await db
    .insert(appointmentsTable)
    .values({
      clinicId: cid,
      patientId,
      doctorId: booking.doctorId ?? undefined,
      date: booking.preferredDate,
      time: booking.preferredTime,
      status: "scheduled",
      notes: [booking.reason, booking.notes].filter(Boolean).join("\n") || undefined,
      type: "consultation",
    })
    .returning();

  // Mark booking as completed
  await db
    .update(onlineBookingsTable)
    .set({ status: "completed" })
    .where(eq(onlineBookingsTable.id, id));

  res.status(201).json({ appointmentId: appt!.id, patientId, message: "Appointment created successfully" });
});

router.use(adminRouter);
export default router;
