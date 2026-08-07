import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, doctorAccountsTable, doctorsTable } from "@workspace/db";
import { z } from "zod";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

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

// ── doctor login ──────────────────────────────────────────────────────────────
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

  res.json({
    doctorId: doctor.id,
    name: `د. ${doctor.firstName} ${doctor.lastName}`,
    specialty: doctor.specialty,
    accountId: account.id,
  });
});

// ── admin: list doctor accounts ───────────────────────────────────────────────
router.get("/admin/doctor-accounts", async (_req, res): Promise<void> => {
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
    .leftJoin(doctorsTable, eq(doctorAccountsTable.doctorId, doctorsTable.id));

  res.json(rows.map(r => ({ ...r, createdAt: r.createdAt?.toISOString() ?? null })));
});

// ── admin: create doctor account ──────────────────────────────────────────────
const CreateBody = z.object({
  doctorId: z.number().int().positive(),
  username: z.string().min(3).max(50),
  password: z.string().min(6),
});

router.post("/admin/doctor-accounts", async (req, res): Promise<void> => {
  const parsed = CreateBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { doctorId, username, password } = parsed.data;

  const existing = await db
    .select()
    .from(doctorAccountsTable)
    .where(eq(doctorAccountsTable.username, username));
  if (existing.length) { res.status(409).json({ error: "اسم المستخدم مستخدم بالفعل" }); return; }

  const passwordHash = await hashPassword(password);
  const [row] = await db
    .insert(doctorAccountsTable)
    .values({ doctorId, username, passwordHash })
    .returning();
  res.status(201).json({ id: row!.id, doctorId: row!.doctorId, username: row!.username, createdAt: row!.createdAt.toISOString() });
});

// ── admin: reset password ─────────────────────────────────────────────────────
const ResetBody = z.object({ password: z.string().min(6) });

router.patch("/admin/doctor-accounts/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = ResetBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" }); return; }
  const passwordHash = await hashPassword(parsed.data.password);
  const [row] = await db
    .update(doctorAccountsTable)
    .set({ passwordHash })
    .where(eq(doctorAccountsTable.id, id))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ok: true });
});

// ── admin: delete doctor account ──────────────────────────────────────────────
router.delete("/admin/doctor-accounts/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(doctorAccountsTable).where(eq(doctorAccountsTable.id, id));
  res.sendStatus(204);
});

export default router;
