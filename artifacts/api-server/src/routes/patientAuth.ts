import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, patientAccountsTable, patientsTable, appointmentsTable, invoicesTable } from "@workspace/db";
import { z } from "zod";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import jwt from "jsonwebtoken";

const router: IRouter = Router();
const scryptAsync = promisify(scrypt);
const JWT_SECRET = process.env.SESSION_SECRET ?? "dev-secret-change-me";

// ── helpers ───────────────────────────────────────────────────────────────────
async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(pin, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function verifyPin(stored: string, supplied: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const buf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(Buffer.from(hashed, "hex"), buf);
}

export function patientAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET) as { role: string; patientId: number };
    if (payload.role !== "patient") { res.status(403).json({ error: "Forbidden" }); return; }
    (req as any).patientId = payload.patientId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

// ── POST /patient-auth/login ──────────────────────────────────────────────────
router.post("/patient-auth/login", async (req, res): Promise<void> => {
  const parsed = z.object({ phone: z.string(), pin: z.string().min(4).max(6) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [account] = await db.select().from(patientAccountsTable)
    .where(eq(patientAccountsTable.phone, parsed.data.phone));

  if (!account || !(await verifyPin(account.pinHash, parsed.data.pin))) {
    res.status(401).json({ error: "رقم الجوال أو الرقم السري غير صحيح" });
    return;
  }

  const [patient] = await db.select().from(patientsTable).where(eq(patientsTable.id, account.patientId));
  if (!patient) { res.status(404).json({ error: "Patient not found" }); return; }

  const token = jwt.sign({ role: "patient", patientId: patient.id }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, patient: { id: patient.id, firstName: patient.firstName, lastName: patient.lastName, phone: patient.phone } });
});

// ── POST /patient-auth/setup ── admin creates patient PIN ─────────────────────
router.post("/patient-auth/setup", async (req, res): Promise<void> => {
  const parsed = z.object({ patientId: z.number(), phone: z.string(), pin: z.string().min(4).max(6) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const pinHash = await hashPin(parsed.data.pin);
  const [existing] = await db.select().from(patientAccountsTable)
    .where(eq(patientAccountsTable.phone, parsed.data.phone));

  if (existing) {
    await db.update(patientAccountsTable).set({ pinHash }).where(eq(patientAccountsTable.phone, parsed.data.phone));
  } else {
    await db.insert(patientAccountsTable).values({ patientId: parsed.data.patientId, phone: parsed.data.phone, pinHash });
  }
  res.json({ success: true });
});

// ── GET /patient/me ────────────────────────────────────────────────────────────
router.get("/patient/me", patientAuth, async (req, res): Promise<void> => {
  const patientId = (req as any).patientId as number;

  const [patient] = await db.select().from(patientsTable).where(eq(patientsTable.id, patientId));
  if (!patient) { res.status(404).json({ error: "Not found" }); return; }

  const appointments = await db.select().from(appointmentsTable)
    .where(eq(appointmentsTable.patientId, patientId))
    .orderBy(appointmentsTable.date);

  const invoices = await db.select().from(invoicesTable)
    .where(eq(invoicesTable.patientId, patientId))
    .orderBy(invoicesTable.createdAt);

  res.json({ patient, appointments, invoices });
});

export default router;
