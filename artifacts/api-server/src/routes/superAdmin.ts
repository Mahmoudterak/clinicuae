import { Router } from "express";
import { db } from "@workspace/db";
import { registeredClinicsTable, superAdminUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export const superAdminRouter = Router();

// ── In-memory session store ──────────────────────────────────────────────────
const sessions = new Map<string, { userId: number; username: string; name: string }>();

function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(password, salt, 64, (err, key) => {
      if (err) reject(err);
      else resolve(`${salt}:${key.toString("hex")}`);
    });
  });
}

function verifyPassword(password: string, stored: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, key] = stored.split(":");
    crypto.scrypt(password, salt, 64, (err, derived) => {
      if (err) reject(err);
      else resolve(derived.toString("hex") === key);
    });
  });
}

function authMiddleware(req: any, res: any, next: any) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  req.superAdmin = sessions.get(token);
  next();
}

function serializeClinic(c: any) {
  return {
    ...c,
    createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
    updatedAt: c.updatedAt instanceof Date ? c.updatedAt.toISOString() : c.updatedAt,
    trialStartAt: c.trialStartAt instanceof Date ? c.trialStartAt.toISOString() : (c.trialStartAt ?? null),
    trialEndAt: c.trialEndAt instanceof Date ? c.trialEndAt.toISOString() : (c.trialEndAt ?? null),
  };
}

// ── Auth ─────────────────────────────────────────────────────────────────────

// POST /superadmin/auth
superAdminRouter.post("/auth", async (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) {
    return res.status(400).json({ error: "Missing credentials" });
  }
  const [user] = await db
    .select()
    .from(superAdminUsersTable)
    .where(eq(superAdminUsersTable.username, username));
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Invalid credentials" });

  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, { userId: user.id, username: user.username, name: user.name });
  return res.json({ token, name: user.name, username: user.username });
});

// DELETE /superadmin/auth (logout)
superAdminRouter.delete("/auth", (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (token) sessions.delete(token);
  return res.status(204).end();
});

// ── Stats ─────────────────────────────────────────────────────────────────────

// GET /superadmin/stats
superAdminRouter.get("/stats", authMiddleware, async (_req, res) => {
  const all = await db.select().from(registeredClinicsTable);
  const planPrices: Record<string, number> = {
    starter: 299,
    pro: 699,
    medical_center: 1799,
  };
  const mrr = all
    .filter((c) => c.status === "active")
    .reduce((sum, c) => sum + (planPrices[c.plan] ?? 0), 0);
  return res.json({
    total: all.length,
    active: all.filter((c) => c.status === "active").length,
    trial: all.filter((c) => c.status === "trial").length,
    suspended: all.filter((c) => c.status === "suspended").length,
    cancelled: all.filter((c) => c.status === "cancelled").length,
    mrr,
  });
});

// ── Clinics ───────────────────────────────────────────────────────────────────

// GET /superadmin/clinics
superAdminRouter.get("/clinics", authMiddleware, async (_req, res) => {
  const clinics = await db
    .select()
    .from(registeredClinicsTable)
    .orderBy(registeredClinicsTable.createdAt);
  return res.json(clinics.map(serializeClinic));
});

// POST /superadmin/clinics (admin-created, requires auth)
superAdminRouter.post("/clinics", authMiddleware, async (req, res) => {
  const { name, ownerName, phone, email, specialty, plan, status, notes } = req.body ?? {};
  if (!name || !ownerName || !phone) {
    return res.status(400).json({ error: "name, ownerName, phone are required" });
  }
  const trialEndAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const [clinic] = await db
    .insert(registeredClinicsTable)
    .values({ name, ownerName, phone, email, specialty, plan: plan ?? "trial", status: status ?? "trial", notes, trialEndAt })
    .returning();
  return res.status(201).json(serializeClinic(clinic));
});

// POST /superadmin/clinics/register — PUBLIC (called from landing page trial form)
superAdminRouter.post("/clinics/register", async (req, res) => {
  const { clinicName, ownerName, phone, email, specialty } = req.body ?? {};
  if (!clinicName || !ownerName || !phone) {
    return res.status(400).json({ error: "clinicName, ownerName, phone are required" });
  }
  const trialEndAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const [clinic] = await db
    .insert(registeredClinicsTable)
    .values({ name: clinicName, ownerName, phone, email, specialty, plan: "trial", status: "trial", trialEndAt })
    .returning();
  return res.status(201).json(serializeClinic(clinic));
});

// PATCH /superadmin/clinics/:id
superAdminRouter.patch("/clinics/:id", authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const allowed = ["name", "ownerName", "phone", "email", "specialty", "plan", "status", "notes"] as const;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const [updated] = await db
    .update(registeredClinicsTable)
    .set(updates as any)
    .where(eq(registeredClinicsTable.id, id))
    .returning();
  if (!updated) return res.status(404).json({ error: "Not found" });
  return res.json(serializeClinic(updated));
});

// DELETE /superadmin/clinics/:id
superAdminRouter.delete("/clinics/:id", authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  await db.delete(registeredClinicsTable).where(eq(registeredClinicsTable.id, id));
  return res.status(204).end();
});

// ── Super admin user management ───────────────────────────────────────────────

// POST /superadmin/users — create super admin user (requires auth)
superAdminRouter.post("/users", authMiddleware, async (req, res) => {
  const { username, password, name } = req.body ?? {};
  if (!username || !password || !name) {
    return res.status(400).json({ error: "username, password, name required" });
  }
  const passwordHash = await hashPassword(password);
  const [user] = await db
    .insert(superAdminUsersTable)
    .values({ username, passwordHash, name })
    .returning();
  return res.status(201).json({ id: user.id, username: user.username, name: user.name, createdAt: user.createdAt.toISOString() });
});

// Export hash utility for seeding
export { hashPassword };
