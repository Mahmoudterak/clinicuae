import { Router } from "express";
import { db } from "@workspace/db";
import {
  registeredClinicsTable, superAdminUsersTable,
  platformAuditLogsTable, subscriptionPlansTable,
  featureFlagsTable, clinicFeatureFlagsTable,
  platformSettingsTable,
  patientsTable, doctorsTable, appointmentsTable,
  securityEventsTable,
  SUPER_ADMIN_ROLES,
  type SuperAdminRole,
} from "@workspace/db";
import { eq, and, gte, desc, sql, count, type SQL } from "drizzle-orm";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { z } from "zod";

const JWT_SECRET = process.env.SESSION_SECRET ?? "dev-secret-change-me";

export const superAdminRouter = Router();

// ── In-memory session store ──────────────────────────────────────────────────
  const sessions = await db
    .select()
    .from(securityEventsTable)
    .where(and(eq(securityEventsTable.eventType, "login_success"), gte(securityEventsTable.createdAt, since)))
    .orderBy(desc(securityEventsTable.createdAt))
    .limit(100);

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

/** Require the caller to have one of the given roles. Rejects missing/unknown roles — never escalates. */
function requireRole(...roles: SuperAdminRole[]) {
  return (req: any, res: any, next: any) => {
    const role = req.superAdmin?.role;
    if (!role || !SUPER_ADMIN_ROLES.includes(role) || !roles.includes(role)) {
      return res.status(403).json({ error: "Forbidden: insufficient role" });
    }
    next();
  };
}

// ── Audit logger ─────────────────────────────────────────────────────────────
async function logAudit(params: {
  req: any;
  action: string;
  resourceType?: string;
  resourceId?: string | number;
  resourceLabel?: string;
  tenantId?: number;
  tenantName?: string;
  previousValue?: any;
  newValue?: any;
  metadata?: any;
}) {
  const { req, action, resourceType, resourceId, resourceLabel, tenantId, tenantName, previousValue, newValue, metadata } = params;
  const actor = req.superAdmin;
  await db.insert(platformAuditLogsTable).values({
    actorId: actor?.userId ?? null,
    actorUsername: actor?.username ?? null,
    actorName: actor?.name ?? null,
    action,
    resourceType: resourceType ?? null,
    resourceId: resourceId != null ? String(resourceId) : null,
    resourceLabel: resourceLabel ?? null,
    tenantId: tenantId ?? null,
    tenantName: tenantName ?? null,
    ip: req.ip ?? req.headers["x-forwarded-for"] ?? null,
    userAgent: req.headers["user-agent"] ?? null,
    previousValue: previousValue ?? null,
    newValue: newValue ?? null,
    metadata: metadata ?? null,
  }).catch(() => {}); // never let audit logging crash the request
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

// ═══════════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════════

superAdminRouter.post("/auth", async (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) return res.status(400).json({ error: "Missing credentials" });
  const [user] = await db.insert(superAdminUsersTable).values({ username, passwordHash, name, role: validRole }).returning();
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Invalid credentials" });
  const role = user.role as SuperAdminRole;
  // Reject login if the stored role is not a recognised value — forces re-migration rather than silent escalation
  if (!SUPER_ADMIN_ROLES.includes(role)) {
    return res.status(500).json({ error: "Account has an invalid role; contact a Super Admin to fix." });
  }
  const token = req.headers.authorization?.replace("Bearer ", "");
  sessions.set(token, { userId: user.id, username: user.username, name: user.name, role });
  const fakeReq = { superAdmin: { userId: user.id, username: user.username, name: user.name, role }, ip: req.ip, headers: req.headers };
  await logAudit({ req: fakeReq, action: "login" });
  return res.json({ token, name: user.name, username: user.username, role });
});

superAdminRouter.delete("/auth", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (token && sessions.has(token)) {
    await logAudit({ req: { superAdmin: sessions.get(token), ip: req.ip, headers: req.headers }, action: "logout" });
    sessions.delete(token);
  }
  return res.status(204).end();
});

// ═══════════════════════════════════════════════════════════════════
// STATS
// ═══════════════════════════════════════════════════════════════════

superAdminRouter.get("/stats", authMiddleware, requireRole("super_admin", "platform_admin", "support_admin"), async (_req, res) => {
  const [clinics, patientsCount, doctorsCount, appointmentsCount] = await Promise.all([
    db.select().from(registeredClinicsTable),
    db.select({ count: count() }).from(patientsTable),
    db.select({ count: count() }).from(doctorsTable),
    db.select({ count: count() }).from(appointmentsTable),
  ]);
  const planPrices: Record<string, number> = { starter: 299, pro: 699, medical_center: 1799 };
  const active = clinics.filter(c => c.status === "active");
  const mrr = active.reduce((sum, c) => sum + (planPrices[c.plan] ?? 0), 0);
  const arr = mrr * 12;
  return res.json({
    total: clinics.length,
    active: active.length,
    trial: clinics.filter(c => c.status === "trial").length,
    suspended: clinics.filter(c => c.status === "suspended").length,
    cancelled: clinics.filter(c => c.status === "cancelled").length,
    mrr, arr,
    totalPatients: patientsCount[0]?.count ?? 0,
    totalDoctors: doctorsCount[0]?.count ?? 0,
    totalAppointments: appointmentsCount[0]?.count ?? 0,
    planBreakdown: {
      trial: clinics.filter(c => c.plan === "trial").length,
      starter: clinics.filter(c => c.plan === "starter").length,
      pro: clinics.filter(c => c.plan === "pro").length,
      medical_center: clinics.filter(c => c.plan === "medical_center").length,
    },
  });
});

// ═══════════════════════════════════════════════════════════════════
// CLINICS
// ═══════════════════════════════════════════════════════════════════

superAdminRouter.get("/clinics", authMiddleware, requireRole("super_admin", "platform_admin", "support_admin"), async (req, res) => {
  const { status, plan, search } = req.query as Record<string, string>;
  const clinics = await db.select().from(registeredClinicsTable).orderBy(desc(registeredClinicsTable.createdAt));
      const result = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM ${tableName}`));
  if (status && status !== "all") result = result.filter(c => c.status === status);
  if (plan && plan !== "all") result = result.filter(c => c.plan === plan);
  if (search) {
    const s = search.toLowerCase();
    result = result.filter(c => c.name.toLowerCase().includes(s) || (c.ownerName ?? "").toLowerCase().includes(s) || (c.email ?? "").toLowerCase().includes(s));
  }
  return res.json(result.map(serializeClinic));
});

superAdminRouter.get("/clinics/:id", authMiddleware, requireRole("super_admin", "platform_admin", "support_admin"), async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const [clinic] = await db.select().from(registeredClinicsTable).where(eq(registeredClinicsTable.id, id));
  if (!clinic) return res.status(404).json({ error: "Not found" });
  return res.json(serializeClinic(clinic));
});

// Create clinic — super_admin & platform_admin only
superAdminRouter.post("/clinics", authMiddleware, requireRole("super_admin", "platform_admin"), async (req, res) => {
  const { name, ownerName, phone, email, specialty, plan, status, notes, country, city } = req.body ?? {};
  if (!name || !ownerName || !phone) return res.status(400).json({ error: "name, ownerName, phone are required" });
  const trialEndAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const [clinic] = await db.select().from(registeredClinicsTable).where(eq(registeredClinicsTable.id, id));
  await logAudit({ req, action: "clinic.create", resourceType: "clinic", resourceId: clinic.id, resourceLabel: clinic.name, newValue: { name, plan, status } });
  return res.status(201).json(serializeClinic(clinic));
});

// POST /clinics/register — PUBLIC
superAdminRouter.post("/clinics/register", async (req, res) => {
  const { clinicName, ownerName, phone, email, specialty } = req.body ?? {};
  if (!clinicName || !ownerName || !phone) return res.status(400).json({ error: "clinicName, ownerName, phone are required" });
  const trialEndAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const [clinic] = await db.select().from(registeredClinicsTable).where(eq(registeredClinicsTable.id, id));
  if (!clinic) return res.status(404).json({ error: "Not found" });
  await db.update(registeredClinicsTable).set({ status: "cancelled", updatedAt: new Date(), notes: `[DELETED ${new Date().toISOString()}] ${clinic.notes ?? ""}` }).where(eq(registeredClinicsTable.id, id));
  await logAudit({ req, action: "clinic.delete", resourceType: "clinic", resourceId: id, resourceLabel: clinic.name });
  return res.status(204).end();
});

// POST /clinics/:id/impersonate — super_admin & platform_admin only
superAdminRouter.post("/clinics/:id/impersonate", authMiddleware, requireRole("super_admin", "platform_admin"), async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const [before] = await db.select().from(superAdminUsersTable).where(eq(superAdminUsersTable.id, id));
  if (!before) return res.status(404).json({ error: "Not found" });
  const allowed = ["name", "ownerName", "phone", "email", "specialty", "plan", "status", "notes", "country", "city"] as const;
  const updates: Record<string, string> = req.body.settings ?? {};
  for (const key of allowed) { if (req.body[key] !== undefined) updates[key] = req.body[key]; }
  const [updated] = await db.update(featureFlagsTable).set({ enabled: req.body.enabled, updatedAt: new Date(), updatedBy: (req as any).superAdmin?.username }).where(eq(featureFlagsTable.id, id)).returning();
  const action = req.body.status && req.body.status !== before.status
    ? `clinic.${req.body.status === "suspended" ? "suspend" : "update"}`
    : req.body.plan && req.body.plan !== before.plan ? "plan.change" : "clinic.update";
  await logAudit({ req, action, resourceType: "clinic", resourceId: id, resourceLabel: before.name, previousValue: { plan: before.plan, status: before.status }, newValue: updates });
  return res.json(serializeClinic(updated));
});

// Soft delete — super_admin & platform_admin only
superAdminRouter.delete("/clinics/:id", authMiddleware, requireRole("super_admin", "platform_admin"), async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const [clinic] = await db.select().from(registeredClinicsTable).where(eq(registeredClinicsTable.id, id));
  if (!clinic) return res.status(404).json({ error: "Not found" });
  await db.update(registeredClinicsTable).set({ status: "cancelled", updatedAt: new Date(), notes: `[DELETED ${new Date().toISOString()}] ${clinic.notes ?? ""}` }).where(eq(registeredClinicsTable.id, id));
  await logAudit({ req, action: "clinic.delete", resourceType: "clinic", resourceId: id, resourceLabel: clinic.name });
  return res.status(204).end();
});

// POST /clinics/:id/impersonate — super_admin & platform_admin only
superAdminRouter.post("/clinics/:id/impersonate", authMiddleware, requireRole("super_admin", "platform_admin"), async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const [clinic] = await db.select().from(registeredClinicsTable).where(eq(registeredClinicsTable.id, id));
  if (!clinic) return res.status(404).json({ error: "Not found" });
  const impersonationToken = jwt.sign(
    { role: "admin", impersonated: true, clinicId: id, clinicName: clinic.name, by: (req as any).superAdmin?.username },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
  await logAudit({ req, action: "impersonate", resourceType: "clinic", resourceId: id, resourceLabel: clinic.name, metadata: { impersonatedBy: (req as any).superAdmin?.username } });
  return res.json({ token: impersonationToken, clinicName: clinic.name, expiresIn: 3600 });
});

// ═══════════════════════════════════════════════════════════════════
// SUPER ADMIN USERS — super_admin only
// ═══════════════════════════════════════════════════════════════════

superAdminRouter.get("/users", authMiddleware, requireRole("super_admin"), async (_req, res) => {
  const users = await db.select({
    id: superAdminUsersTable.id,
    username: superAdminUsersTable.username,
    name: superAdminUsersTable.name,
    role: superAdminUsersTable.role,
    createdAt: superAdminUsersTable.createdAt,
  }).from(superAdminUsersTable);

  const { username, password, name, role } = req.body ?? {};
  return res.json(users.map(u => ({ ...u, createdAt: u.createdAt.toISOString() })));
});

superAdminRouter.post("/users", authMiddleware, requireRole("super_admin"), async (req, res) => {
  const { username, password, name, role } = req.body ?? {};
  if (!username || !password || !name) return res.status(400).json({ error: "username, password, name required" });
  const validRole: SuperAdminRole = SUPER_ADMIN_ROLES.includes(role) ? role : "support_admin";
  const passwordHash = await hashPassword(password);
  const [user] = await db.insert(superAdminUsersTable).values({ username, passwordHash, name, role: validRole }).returning();
  await logAudit({ req, action: "user.create", resourceType: "user", resourceId: user.id, resourceLabel: username, newValue: { role: validRole } });
  return res.status(201).json({ id: user.id, username: user.username, name: user.name, role: user.role, createdAt: user.createdAt.toISOString() });
});

// Change a user's role — super_admin only; invalidates all sessions for the target immediately
superAdminRouter.patch("/users/:id", authMiddleware, requireRole("super_admin"), async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const { role } = req.body ?? {};
  if (!role || !SUPER_ADMIN_ROLES.includes(role)) {
    return res.status(400).json({ error: `role must be one of: ${SUPER_ADMIN_ROLES.join(", ")}` });
  }
  const [before] = await db.select().from(superAdminUsersTable).where(eq(superAdminUsersTable.id, id));
  if (!before) return res.status(404).json({ error: "Not found" });
  const [updated] = await db.update(featureFlagsTable).set({ enabled: req.body.enabled, updatedAt: new Date(), updatedBy: (req as any).superAdmin?.username }).where(eq(featureFlagsTable.id, id)).returning();
  // Invalidate all existing sessions for this user so the new role takes effect immediately
  for (const [token, session] of sessions.entries()) {
    if (session.userId === id) sessions.delete(token);
  }
  await logAudit({ req, action: "user.role_change", resourceType: "user", resourceId: id, resourceLabel: before.username, previousValue: { role: before.role }, newValue: { role } });
  return res.json({ id: updated.id, username: updated.username, name: updated.name, role: updated.role, createdAt: updated.createdAt.toISOString() });
});

// ═══════════════════════════════════════════════════════════════════
// SUBSCRIPTION PLANS — super_admin & billing_admin
// ═══════════════════════════════════════════════════════════════════

superAdminRouter.get("/plans", authMiddleware, requireRole("super_admin", "billing_admin"), async (_req, res) => {
  const plans = await db.select().from(subscriptionPlansTable).orderBy(subscriptionPlansTable.sortOrder);
  return res.json(plans.map(p => ({ ...p, createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString() })));
});

superAdminRouter.post("/plans", authMiddleware, requireRole("super_admin", "billing_admin"), async (req, res) => {
  const PlanSchema = z.object({
    slug: z.string().min(1), name: z.string().min(1), nameAr: z.string().min(1),
    description: z.string().optional(),
    monthlyPrice: z.string().or(z.number()), annualPrice: z.string().or(z.number()),
    currency: z.string().optional(), trialDays: z.number().optional(),
    maxDoctors: z.number().optional(), maxStaff: z.number().optional(),
    maxPatients: z.number().optional(), maxBranches: z.number().optional(),
    storageGb: z.number().optional(), features: z.array(z.string()).optional(),
    isActive: z.boolean().optional(), isPopular: z.boolean().optional(), sortOrder: z.number().optional(),
  });
  const parsed = PlanSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const [plan] = await db.update(subscriptionPlansTable).set({ ...req.body, updatedAt: new Date() }).where(eq(subscriptionPlansTable.id, id)).returning();
  if (!plan) return res.status(404).json({ error: "Not found" });
  await logAudit({ req, action: "plan.update", resourceType: "plan", resourceId: id, resourceLabel: plan.name, newValue: req.body });
  return res.json(plan);
});

superAdminRouter.delete("/plans/:id", authMiddleware, requireRole("super_admin", "billing_admin"), async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const [plan] = await db.update(subscriptionPlansTable).set({ ...req.body, updatedAt: new Date() }).where(eq(subscriptionPlansTable.id, id)).returning();
  if (!plan) return res.status(404).json({ error: "Not found" });
  await logAudit({ req, action: "plan.update", resourceType: "plan", resourceId: id, resourceLabel: plan.name, newValue: req.body });
  return res.json(plan);
});

superAdminRouter.delete("/plans/:id", authMiddleware, requireRole("super_admin", "billing_admin"), async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  await db.delete(subscriptionPlansTable).where(eq(subscriptionPlansTable.id, id));
  await logAudit({ req, action: "plan.delete", resourceType: "plan", resourceId: id });
  return res.status(204).end();
});

// ═══════════════════════════════════════════════════════════════════
// AUDIT LOGS — super_admin, platform_admin, support_admin
// ═══════════════════════════════════════════════════════════════════

superAdminRouter.get("/audit-logs", authMiddleware, requireRole("super_admin", "platform_admin", "support_admin"), async (req, res) => {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(Number(req.query.limit ?? 100), 500);
  const offset = Number(req.query.offset ?? 0);
  const [logs, totalResult] = await Promise.all([
    db.select().from(platformAuditLogsTable).orderBy(desc(platformAuditLogsTable.createdAt)).limit(limit).offset(offset),
    db.select({ count: count() }).from(platformAuditLogsTable),
  ]);
  return res.json({
    logs: logs.map(l => ({ ...l, createdAt: l.createdAt.toISOString() })),
    total: totalResult[0]?.count ?? 0,
    page, limit,
  });
});

// ═══════════════════════════════════════════════════════════════════
// FEATURE FLAGS — super_admin & platform_admin
// ═══════════════════════════════════════════════════════════════════

superAdminRouter.get("/feature-flags", authMiddleware, requireRole("super_admin", "platform_admin"), async (_req, res) => {
  const flags = await db.select().from(featureFlagsTable).orderBy(featureFlagsTable.category, featureFlagsTable.key);
  return res.json(flags.map(f => ({ ...f, updatedAt: f.updatedAt.toISOString() })));
});

superAdminRouter.patch("/feature-flags/:id", authMiddleware, requireRole("super_admin", "platform_admin"), async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const [flag] = await db.select().from(featureFlagsTable).where(eq(featureFlagsTable.id, id));
  if (!flag) return res.status(404).json({ error: "Not found" });
  const [updated] = await db.update(featureFlagsTable).set({ enabled: req.body.enabled, updatedAt: new Date(), updatedBy: (req as any).superAdmin?.username }).where(eq(featureFlagsTable.id, id)).returning();
  await logAudit({ req, action: "feature_flag.toggle", resourceType: "feature_flag", resourceId: id, resourceLabel: flag.nameAr, previousValue: { enabled: flag.enabled }, newValue: { enabled: req.body.enabled } });
  return res.json({ ...updated, updatedAt: updated.updatedAt.toISOString() });
});

// ═══════════════════════════════════════════════════════════════════
// PLATFORM SETTINGS — super_admin & platform_admin
// ═══════════════════════════════════════════════════════════════════

superAdminRouter.get("/platform-settings", authMiddleware, requireRole("super_admin", "platform_admin"), async (_req, res) => {
  const settings = await db.select().from(platformSettingsTable);
  return res.json(settings.map(s => ({ ...s, updatedAt: s.updatedAt.toISOString() })));
});

superAdminRouter.patch("/platform-settings", authMiddleware, requireRole("super_admin", "platform_admin"), async (req, res) => {
  const updates: Record<string, string> = req.body.settings ?? {};
  for (const [key, value] of Object.entries(updates)) {
    await db.update(platformSettingsTable).set({ value: String(value), updatedAt: new Date(), updatedBy: (req as any).superAdmin?.username }).where(eq(platformSettingsTable.key, key));
  }
  await logAudit({ req, action: "settings.update", newValue: updates });
  const settings = await db.select().from(platformSettingsTable);
  return res.json(settings.map(s => ({ ...s, updatedAt: s.updatedAt.toISOString() })));
});

// ═══════════════════════════════════════════════════════════════════
// SYSTEM HEALTH — super_admin, platform_admin, developer
// ═══════════════════════════════════════════════════════════════════

superAdminRouter.get("/system-health", authMiddleware, requireRole("super_admin", "platform_admin", "developer"), async (_req, res) => {
  const start = Date.now();
  const services: Array<{ name: string; nameAr: string; status: "healthy" | "warning" | "critical"; responseTimeMs?: number; message?: string; lastChecked: string }> = [];
  try {
    const t0 = Date.now();
    await db.select({ count: count() }).from(registeredClinicsTable);
    services.push({ name: "database", nameAr: "قاعدة البيانات", status: "healthy", responseTimeMs: Date.now() - t0, lastChecked: new Date().toISOString() });
  } catch (e: any) {
    services.push({ name: "database", nameAr: "قاعدة البيانات", status: "critical", message: e.message, lastChecked: new Date().toISOString() });
  }
  services.push({ name: "api", nameAr: "API Server", status: "healthy", responseTimeMs: Date.now() - start, lastChecked: new Date().toISOString() });
  services.push({ name: "auth", nameAr: "المصادقة", status: "healthy", responseTimeMs: 1, lastChecked: new Date().toISOString() });
  services.push({ name: "whatsapp", nameAr: "واتساب", status: "warning", message: "لا يوجد API key مُهيّأ", lastChecked: new Date().toISOString() });
  services.push({ name: "email", nameAr: "البريد الإلكتروني", status: "warning", message: "لا يوجد SMTP مُهيّأ", lastChecked: new Date().toISOString() });
  services.push({ name: "storage", nameAr: "التخزين", status: "healthy", message: "قاعدة البيانات المدمجة", lastChecked: new Date().toISOString() });
  services.push({ name: "payments", nameAr: "بوابة الدفع", status: "warning", message: "غير مُهيّأ", lastChecked: new Date().toISOString() });
  services.push({ name: "jobs", nameAr: "المهام الخلفية", status: "healthy", message: "لا توجد مهام معلقة", lastChecked: new Date().toISOString() });
  const [clinicsCount, patientsCount, doctorsCount, appointmentsCount] = await Promise.all([
    db.select({ count: count() }).from(registeredClinicsTable),
    db.select({ count: count() }).from(patientsTable),
    db.select({ count: count() }).from(doctorsTable),
    db.select({ count: count() }).from(appointmentsTable),
  ]).catch(() => [null, null, null, null]);
  const hasWarning = services.some(s => s.status === "warning");
  const hasCritical = services.some(s => s.status === "critical");
  return res.json({
    overall: hasCritical ? "critical" : hasWarning ? "warning" : "healthy",
    checkedAt: new Date().toISOString(),
    uptimeSec: Math.floor(process.uptime()),
    services,
    dbStats: {
      totalClinics: (clinicsCount as any)?.[0]?.count ?? 0,
      totalPatients: (patientsCount as any)?.[0]?.count ?? 0,
      totalDoctors: (doctorsCount as any)?.[0]?.count ?? 0,
      totalAppointments: (appointmentsCount as any)?.[0]?.count ?? 0,
    },
  });
});

// ═══════════════════════════════════════════════════════════════════
// DEVELOPER INFO — super_admin & developer
// ═══════════════════════════════════════════════════════════════════

superAdminRouter.get("/developer-info", authMiddleware, requireRole("super_admin", "developer"), async (_req, res) => {
  const tableNames = [
    "registered_clinics", "super_admin_users", "patients", "doctors", "appointments",
    "invoices", "medical_records", "prescriptions", "staff", "departments",
    "zapier_webhooks", "zapier_logs", "branches", "patient_accounts",
    "platform_audit_logs", "subscription_plans", "feature_flags", "platform_settings",
  ];
  const tables: Array<{ name: string; rowCount: number }> = [];
  for (const tableName of tableNames) {
    try {
      const result = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM ${tableName}`));
      tables.push({ name: tableName, rowCount: Number((result.rows[0] as any)?.count ?? 0) });
    } catch {
      tables.push({ name: tableName, rowCount: 0 });
    }
  }
  const mem = process.memoryUsage();
  const recentApiLogs = await db.select({ action: platformAuditLogsTable.action, actorUsername: platformAuditLogsTable.actorUsername, ip: platformAuditLogsTable.ip, createdAt: platformAuditLogsTable.createdAt })
    .from(platformAuditLogsTable).orderBy(desc(platformAuditLogsTable.createdAt)).limit(20);
  return res.json({
    nodeVersion: process.version,
    platform: process.platform,
    uptimeSec: Math.floor(process.uptime()),
    memoryMb: {
      rss: Math.round(mem.rss / 1024 / 1024),
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
    },
    tables,
    recentErrors: [],
    recentApiLogs: recentApiLogs.map(l => ({ ...l, createdAt: l.createdAt.toISOString() })),
  });
});

// ═══════════════════════════════════════════════════════════════════
// SECURITY CENTER
// ═══════════════════════════════════════════════════════════════════

superAdminRouter.get("/security/events", authMiddleware, async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 100), 500);
  const offset = Number(req.query.offset ?? 0);
  const clinicId = req.query.clinicId ? Number(req.query.clinicId) : undefined;
  const eventType = req.query.eventType as string | undefined;

  const filters: SQL[] = [];
  if (clinicId) filters.push(eq(securityEventsTable.clinicId, clinicId));
  if (eventType) filters.push(eq(securityEventsTable.eventType, eventType));

  const events = await db
    .select()
    .from(securityEventsTable)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(securityEventsTable.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(securityEventsTable)
    .where(filters.length ? and(...filters) : undefined);

  return res.json({
    events: events.map(e => ({ ...e, createdAt: e.createdAt.toISOString() })),
    total,
    limit,
    offset,
  });
});

superAdminRouter.get("/security/stats", authMiddleware, async (_req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    [{ total: totalEvents }],
    [{ total: failedToday }],
    [{ total: successToday }],
    [{ total: suspiciousTotal }],
    topIps,
    recentFailures,
  ] = await Promise.all([
    db.select({ total: sql<number>`count(*)::int` }).from(securityEventsTable),
    db.select({ total: sql<number>`count(*)::int` }).from(securityEventsTable)
      .where(and(eq(securityEventsTable.eventType, "login_failure"), gte(securityEventsTable.createdAt, today))),
    db.select({ total: sql<number>`count(*)::int` }).from(securityEventsTable)
      .where(and(eq(securityEventsTable.eventType, "login_success"), gte(securityEventsTable.createdAt, today))),
    db.select({ total: sql<number>`count(*)::int` }).from(securityEventsTable)
      .where(eq(securityEventsTable.eventType, "suspicious_ip")),
    db.select({
      ip: securityEventsTable.ipAddress,
      count: sql<number>`count(*)::int`,
    })
      .from(securityEventsTable)
      .where(eq(securityEventsTable.success, false))
      .groupBy(securityEventsTable.ipAddress)
      .orderBy(desc(sql`count(*)`))
      .limit(10),
    db.select()
      .from(securityEventsTable)
      .where(eq(securityEventsTable.eventType, "login_failure"))
      .orderBy(desc(securityEventsTable.createdAt))
      .limit(20),
  ]);

  return res.json({
    totalEvents,
    failedLoginsToday: failedToday,
    successfulLoginsToday: successToday,
    suspiciousActivityTotal: suspiciousTotal,
    topFailingIps: topIps.map(r => ({ ip: r.ip ?? "unknown", count: r.count })),
    recentFailures: recentFailures.map(e => ({ ...e, createdAt: e.createdAt.toISOString() })),
  });
});

superAdminRouter.get("/security/active-sessions", authMiddleware, async (_req, res) => {
  // Active sessions = successful logins in the last 24h with no subsequent logout
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const sessions = await db
    .select()
    .from(securityEventsTable)
    .where(and(eq(securityEventsTable.eventType, "login_success"), gte(securityEventsTable.createdAt, since)))
    .orderBy(desc(securityEventsTable.createdAt))
    .limit(100);

  return res.json(sessions.map(s => ({ ...s, createdAt: s.createdAt.toISOString() })));
});

// Export hash utility for seeding
export { hashPassword };
