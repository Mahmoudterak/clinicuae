import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, doctorAccountsTable, doctorsTable } from "@workspace/db";
import { requireClinic } from "../middlewares/adminAuth";
import { z } from "zod";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.SESSION_SECRET ?? "dev-secret-change-me";

const router: IRouter = Router();
const scryptAsync = promisify(scrypt);

// ── password helpers ──────────────────────────────────────────────────────────
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function verifyPassword(stored: string, supplied: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  if (!hashed || !salt) return false;
  const buf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(Buffer.from(hashed, "hex"), buf);
}

// ── doctor login (public) ─────────────────────────────────────────────────────
const LoginBody = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

router.post("/doctor-auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid request" }); return; }
  const { username, password } = parsed.data;

  const [account] = await db
    .select()
    .from(doctorAccountsTable)
    .where(eq(doctorAccountsTable.username, username));

  if (!account) { res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" }); return; }

  const ok = await verifyPassword(account.passwordHash, password);
  if (!ok) { res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" }); return; }

  const [doctor] = await db
    .select()
    .from(doctorsTable)
    .where(eq(doctorsTable.id, account.doctorId));

  if (!doctor) { res.status(404).json({ error: "بيانات الطبيب غير موجودة" }); return; }

  const token = jwt.sign(
    { role: "doctor", doctorId: doctor.id, clinicId: account.clinicId },
    JWT_SECRET,
    { expiresIn: "12h" }
  );

  res.json({
    token,
    doctorId: doctor.id,
    name: `د. ${doctor.firstName} ${doctor.lastName}`,
    specialty: doctor.specialty,
    accountId: account.id,
    clinicId: account.clinicId,
  });
});

// ── admin routes (require clinic scope) ───────────────────────────────────────
const adminRouter: IRouter = Router();
adminRouter.use(requireClinic);

adminRouter.get("/admin/doctor-accounts", async (req, res): Promise<void> => {
  const cid = req.clinicId!;
  const rows = await db
    .select({
      id: doctorAccountsTable.id,
      doctorId: doctorAccountsTable.doctorId,
      username: doctorAccountsTable.username,
      createdAt: doctorAccountsTable.createdAt,
      firstName: doctorsTable.firstName,
      lastName: doctorsTable.lastName,
      specialty: doctorsTable.specialty,
    })
    .from(doctorAccountsTable)
    .leftJoin(doctorsTable, eq(doctorAccountsTable.doctorId, doctorsTable.id))
    .where(eq(doctorAccountsTable.clinicId, cid));

  res.json(rows.map(r => ({ ...r, createdAt: r.createdAt?.toISOString() ?? null })));
});

const CreateBody = z.object({
  doctorId: z.number().int().positive(),
  username: z.string().min(3).max(50),
  password: z.string().min(6),
});

adminRouter.post("/admin/doctor-accounts", async (req, res): Promise<void> => {
  const parsed = CreateBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { doctorId, username, password } = parsed.data;
  const cid = req.clinicId!;

  const existing = await db
    .select()
    .from(doctorAccountsTable)
    .where(eq(doctorAccountsTable.username, username));
  if (existing.length) { res.status(409).json({ error: "اسم المستخدم مستخدم بالفعل" }); return; }

  const passwordHash = await hashPassword(password);
  const [row] = await db
    .insert(doctorAccountsTable)
    .values({ clinicId: cid, doctorId, username, passwordHash })
    .returning();
  res.status(201).json({
    id: row!.id,
    clinicId: row!.clinicId,
    doctorId: row!.doctorId,
    username: row!.username,
    createdAt: row!.createdAt.toISOString(),
  });
});

const ResetBody = z.object({ password: z.string().min(6) });

adminRouter.patch("/admin/doctor-accounts/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = ResetBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" }); return; }
  const passwordHash = await hashPassword(parsed.data.password);
  const [row] = await db
    .update(doctorAccountsTable)
    .set({ passwordHash })
    .where(and(eq(doctorAccountsTable.clinicId, req.clinicId!), eq(doctorAccountsTable.id, id)))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ok: true });
});

adminRouter.delete("/admin/doctor-accounts/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db
    .delete(doctorAccountsTable)
    .where(and(eq(doctorAccountsTable.clinicId, req.clinicId!), eq(doctorAccountsTable.id, id)));
  res.sendStatus(204);
});

// Mount both public and admin sub-routers
router.use(adminRouter);

export default router;
