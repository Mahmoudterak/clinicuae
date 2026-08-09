import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, onlineBookingsTable, doctorsTable, appointmentsTable } from "@workspace/db";
import { z } from "zod";
import { fireZapierWebhook } from "./zapier";

const router: IRouter = Router();

function isoBooking(row: typeof onlineBookingsTable.$inferSelect) {
  return { ...row, createdAt: row.createdAt.toISOString() };
}

async function withDoctorName(rows: (typeof onlineBookingsTable.$inferSelect)[]) {
  const doctors = await db.select().from(doctorsTable);
  const dMap = new Map(doctors.map(d => [d.id, `${d.firstName} ${d.lastName}`]));
  return rows.map(r => ({ ...isoBooking(r), doctorName: r.doctorId ? (dMap.get(r.doctorId) ?? null) : null }));
}

const CreateBookingBody = z.object({
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

// Public: list available doctors (no auth required)
router.get("/public/doctors", async (_req, res): Promise<void> => {
  const doctors = await db.select({
    id: doctorsTable.id,
    firstName: doctorsTable.firstName,
    lastName: doctorsTable.lastName,
    specialty: doctorsTable.specialty,
    status: doctorsTable.status,
  }).from(doctorsTable).where(eq(doctorsTable.status, "active"));
  res.json(doctors);
});

// Public: get booked slots for a doctor/date
router.get("/public/booked-slots", async (req, res): Promise<void> => {
  const { doctorId, date } = req.query as { doctorId: string; date: string };
  if (!doctorId || !date) { res.json([]); return; }
  const appts = await db.select({ time: appointmentsTable.time })
    .from(appointmentsTable)
    .where(and(eq(appointmentsTable.doctorId, Number(doctorId)), eq(appointmentsTable.date, date)));
  const bookings = await db.select({ time: onlineBookingsTable.preferredTime })
    .from(onlineBookingsTable)
    .where(and(eq(onlineBookingsTable.doctorId, Number(doctorId)), eq(onlineBookingsTable.preferredDate, date), eq(onlineBookingsTable.status, "confirmed")));
  const taken = [...appts.map(a => a.time), ...bookings.map(b => b.time)];
  res.json(taken);
});

// Public: create booking
router.post("/public/bookings", async (req, res): Promise<void> => {
  const parsed = UpdateBookingBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [row] = await db.update(onlineBookingsTable).set(parsed.data).where(eq(onlineBookingsTable.id, id)).returning();
  res.status(201).json(isoBooking(row!));
});

// Admin: list all bookings
router.get("/bookings", async (req, res): Promise<void> => {
  const { status } = req.query as { status?: string };
  const rows = status
    ? await db.select().from(onlineBookingsTable).where(eq(onlineBookingsTable.status, status)).orderBy(desc(onlineBookingsTable.createdAt))
    : await db.select().from(onlineBookingsTable).orderBy(desc(onlineBookingsTable.createdAt));
  res.json(await withDoctorName(rows));
});

// Admin: update booking status / notes
router.patch("/bookings/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateBookingBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [row] = await db.update(onlineBookingsTable).set(parsed.data).where(eq(onlineBookingsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }

  // If confirmed, doctor should verify and add patient manually for now
  if (parsed.data.status === "confirmed" && row.doctorId) {
    // Booking confirmed: doctor can then create a formal appointment
  }

  const [enriched] = await withDoctorName([row]);
  res.json(enriched);
});

router.delete("/bookings/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(onlineBookingsTable).where(eq(onlineBookingsTable.id, id));
  res.sendStatus(204);
});

export default router;
