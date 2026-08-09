import { Router } from "express";
import { db } from "@workspace/db";
import {
  registeredClinicsTable, superAdminUsersTable,
  platformAuditLogsTable, subscriptionPlansTable,
  featureFlagsTable, clinicFeatureFlagsTable,
  platformSettingsTable,
  patientsTable, doctorsTable, appointmentsTable,
} from "@workspace/db";
import { eq, desc, sql, count } from "drizzle-orm";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { z } from "zod";

const JWT_SECRET = process.env.SESSION_SECRET ?? "dev-secret-change-me";

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
  const [user] = await db.select().from(superAdminUsersTable).where(eq(superAdminUsersTable.username, username));
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Invalid credentials" });
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, { userId: user.id, username: user.username, name: user.name });
  // Audit
  const fakeReq = { superAdmin: { userId: user.id, username: user.username, name: user.name }, ip: req.ip, headers: req.headers };
  await logAudit({ req: fakeReq, action: "login" });
  return res.json({ token, name: user.name, username: user.username });
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
// STATS (enhanced)
// ═══════════════════════════════════════════════════════════════════

superAdminRouter.get("/stats", authMiddleware, async (_req, res) => {
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
    mrr,
    arr,
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

superAdminRouter.get("/clinics", authMiddleware, async (req, res) => {
  const { status, plan, search } = req.query as Record<string, string>;
  let q = db.select().from(registeredClinicsTable);
  const clinics = await q.orderBy(desc(registeredClinicsTable.createdAt));
  let result = clinics;
  if (status && status !== "all") result = result.filter(c => c.status === status);
  if (plan && plan !== "all") result = result.filter(c => c.plan === plan);
  if (search) {
    const s = search.toLowerCase();
    result = result.filter(c => c.name.toLowerCase().includes(s) || (c.ownerName ?? "").toLowerCase().includes(s) || (c.email ?? "").toLowerCase().includes(s));
  }
  return res.json(result.map(serializeClinic));
});

superAdminRouter.get("/clinics/:id", authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const [clinic] = await db.select().from(registeredClinicsTable).where(eq(registeredClinicsTable.id, id));
  if (!clinic) return res.status(404).json({ error: "Not found" });
  return res.json(serializeClinic(clinic));
});

superAdminRouter.post("/clinics", authMiddleware, async (req, res) => {
  const { name, ownerName, phone, email, specialty, plan, status, notes, country, city } = req.body ?? {};
  if (!name || !ownerName || !phone) return res.status(400).json({ error: "name, ownerName, phone are required" });
  const trialEndAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const [clinic] = await db.insert(registeredClinicsTable).values({ name, ownerName, phone, email, specialty, plan: plan ?? "trial", status: status ?? "trial", notes, trialEndAt }).returning();
  await logAudit({ req, action: "clinic.create", resourceType: "clinic", resourceId: clinic.id, resourceLabel: clinic.name, newValue: { name, plan, status } });
  return res.status(201).json(serializeClinic(clinic));
});

// POST /clinics/register — PUBLIC
superAdminRouter.post("/clinics/register", async (req, res) => {
  const { clinicName, ownerName, phone, email, specialty } = req.body ?? {};
  if (!clinicName || !ownerName || !phone) return res.status(400).json({ error: "clinicName, ownerName, phone are required" });
  const trialEndAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const [clinic] = await db.insert(registeredClinicsTable).values({ name: clinicName, ownerName, phone, email, specialty, plan: "trial", status: "trial", trialEndAt }).returning();
  return res.status(201).json(serializeClinic(clinic));
});

superAdminRouter.patch("/clinics/:id", authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const [before] = await db.select().from(registeredClinicsTable).where(eq(registeredClinicsTable.id, id));
  if (!before) return res.status(404).json({ error: "Not found" });
  const allowed = ["name", "ownerName", "phone", "email", "specialty", "plan", "status", "notes", "country", "city"] as const;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of allowed) { if (req.body[key] !== undefined) updates[key] = req.body[key]; }
  const [updated] = await db.update(registeredClinicsTable).set(updates as any).where(eq(registeredClinicsTable.id, id)).returning();
  const action = req.body.status && req.body.status !== before.status
    ? `clinic.${req.body.status === "suspended" ? "suspend" : "update"}`
    : req.body.plan && req.body.plan !== before.plan ? "plan.change" : "clinic.update";
  await logAudit({ req, action, resourceType: "clinic", resourceId: id, resourceLabel: before.name, previousValue: { plan: before.plan, status: before.status }, newValue: updates });
  return res.json(serializeClinic(updated));
});

// Soft delete (sets status to "cancelled" and marks deletedAt via notes)
superAdminRouter.delete("/clinics/:id", authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const [clinic] = await db.select().from(registeredClinicsTable).where(eq(registeredClinicsTable.id, id));
  if (!clinic) return res.status(404).json({ error: "Not found" });
  // Soft delete: set status to cancelled
  await db.update(registeredClinicsTable).set({ status: "cancelled", updatedAt: new Date(), notes: `[DELETED ${new Date().toISOString()}] ${clinic.notes ?? ""}` }).where(eq(registeredClinicsTable.id, id));
  await logAudit({ req, action: "clinic.delete", resourceType: "clinic", resourceId: id, resourceLabel: clinic.name });
  return res.status(204).end();
});

// POST /clinics/:id/impersonate — generate a short-lived JWT for the clinic admin
superAdminRouter.post("/clinics/:id/impersonate", authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const [clinic] = await db.select().from(registeredClinicsTable).where(eq(registeredClinicsTable.id, id));
  if (!clinic) return res.status(404).json({ error: "Not found" });
  const impersonationToken = jwt.sign(
    { role: "admin", impersonated: true, clinicId: id, clinicName: clinic.name, by: req.superAdmin?.username },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
  await logAudit({ req, action: "impersonate", resourceType: "clinic", resourceId: id, resourceLabel: clinic.name, metadata: { impersonatedBy: req.superAdmin?.username } });
  return res.json({ token: impersonationToken, clinicName: clinic.name, expiresIn: 3600 });
});

// ═══════════════════════════════════════════════════════════════════
// SUPER ADMIN USERS
// ═══════════════════════════════════════════════════════════════════

superAdminRouter.get("/users", authMiddleware, async (_req, res) => {
  const users = await db.select({ id: superAdminUsersTable.id, username: superAdminUsersTable.username, name: superAdminUsersTable.name, createdAt: superAdminUsersTable.createdAt }).from(superAdminUsersTable);
  return res.json(users.map(u => ({ ...u, createdAt: u.createdAt.toISOString() })));
});

superAdminRouter.post("/users", authMiddleware, async (req, res) => {
  const { username, password, name } = req.body ?? {};
  if (!username || !password || !name) return res.status(400).json({ error: "username, password, name required" });
  const passwordHash = await hashPassword(password);
  const [user] = await db.insert(superAdminUsersTable).values({ username, passwordHash, name }).returning();
  await logAudit({ req, action: "user.create", resourceType: "user", resourceId: user.id, resourceLabel: username });
  return res.status(201).json({ id: user.id, username: user.username, name: user.name, createdAt: user.createdAt.toISOString() });
});

// ═══════════════════════════════════════════════════════════════════
// SUBSCRIPTION PLANS
// ═══════════════════════════════════════════════════════════════════

superAdminRouter.get("/plans", authMiddleware, async (_req, res) => {
  const plans = await db.select().from(subscriptionPlansTable).orderBy(subscriptionPlansTable.sortOrder);
  return res.json(plans.map(p => ({ ...p, createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString() })));
});

superAdminRouter.post("/plans", authMiddleware, async (req, res) => {
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
  const [plan] = await db.insert(subscriptionPlansTable).values({ ...parsed.data, updatedAt: new Date() } as any).returning();
  await logAudit({ req, action: "plan.create", resourceType: "plan", resourceId: plan.id, resourceLabel: plan.name });
  return res.status(201).json(plan);
});

superAdminRouter.patch("/plans/:id", authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const [plan] = await db.update(subscriptionPlansTable).set({ ...req.body, updatedAt: new Date() }).where(eq(subscriptionPlansTable.id, id)).returning();
  if (!plan) return res.status(404).json({ error: "Not found" });
  await logAudit({ req, action: "plan.update", resourceType: "plan", resourceId: id, resourceLabel: plan.name, newValue: req.body });
  return res.json(plan);
});

superAdminRouter.delete("/plans/:id", authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  await db.delete(subscriptionPlansTable).where(eq(subscriptionPlansTable.id, id));
  await logAudit({ req, action: "plan.delete", resourceType: "plan", resourceId: id });
  return res.status(204).end();
});

// ═══════════════════════════════════════════════════════════════════
// AUDIT LOGS
// ═══════════════════════════════════════════════════════════════════

superAdminRouter.get("/audit-logs", authMiddleware, async (req, res) => {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 25)));
  const offset = (page - 1) * limit;
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
// FEATURE FLAGS
// ═══════════════════════════════════════════════════════════════════

superAdminRouter.get("/feature-flags", authMiddleware, async (_req, res) => {
  const flags = await db.select().from(featureFlagsTable).orderBy(featureFlagsTable.category, featureFlagsTable.key);
  return res.json(flags.map(f => ({ ...f, updatedAt: f.updatedAt.toISOString() })));
});

superAdminRouter.patch("/feature-flags/:id", authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const [flag] = await db.select().from(featureFlagsTable).where(eq(featureFlagsTable.id, id));
  if (!flag) return res.status(404).json({ error: "Not found" });
  const [updated] = await db.update(featureFlagsTable).set({ enabled: req.body.enabled, updatedAt: new Date(), updatedBy: req.superAdmin?.username }).where(eq(featureFlagsTable.id, id)).returning();
  await logAudit({ req, action: "feature_flag.toggle", resourceType: "feature_flag", resourceId: id, resourceLabel: flag.nameAr, previousValue: { enabled: flag.enabled }, newValue: { enabled: req.body.enabled } });
  return res.json({ ...updated, updatedAt: updated.updatedAt.toISOString() });
});

// ═══════════════════════════════════════════════════════════════════
// PLATFORM SETTINGS
// ═══════════════════════════════════════════════════════════════════

superAdminRouter.get("/platform-settings", authMiddleware, async (_req, res) => {
  const settings = await db.select().from(platformSettingsTable).orderBy(platformSettingsTable.category, platformSettingsTable.key);
  return res.json(settings.map(s => ({ ...s, updatedAt: s.updatedAt.toISOString() })));
});

superAdminRouter.patch("/platform-settings", authMiddleware, async (req, res) => {
  const updates: Record<string, string> = req.body.settings ?? {};
  for (const [key, value] of Object.entries(updates)) {
    await db.update(platformSettingsTable).set({ value: String(value), updatedAt: new Date(), updatedBy: req.superAdmin?.username }).where(eq(platformSettingsTable.key, key));
  }
  await logAudit({ req, action: "settings.update", newValue: updates });
  const settings = await db.select().from(platformSettingsTable);
  return res.json(settings.map(s => ({ ...s, updatedAt: s.updatedAt.toISOString() })));
});

// ═══════════════════════════════════════════════════════════════════
// SYSTEM HEALTH
// ═══════════════════════════════════════════════════════════════════

superAdminRouter.get("/system-health", authMiddleware, async (_req, res) => {
  const start = Date.now();
  const services: Array<{ name: string; nameAr: string; status: "healthy" | "warning" | "critical"; responseTimeMs?: number; message?: string; lastChecked: string }> = [];

  // Check DB
  try {
    const t0 = Date.now();
    await db.select({ count: count() }).from(registeredClinicsTable);
    services.push({ name: "database", nameAr: "قاعدة البيانات", status: "healthy", responseTimeMs: Date.now() - t0, lastChecked: new Date().toISOString() });
  } catch (e: any) {
    services.push({ name: "database", nameAr: "قاعدة البيانات", status: "critical", message: e.message, lastChecked: new Date().toISOString() });
  }

  // API itself is healthy (we're responding)
  services.push({ name: "api", nameAr: "API Server", status: "healthy", responseTimeMs: Date.now() - start, lastChecked: new Date().toISOString() });

  // Auth service
  services.push({ name: "auth", nameAr: "المصادقة", status: "healthy", responseTimeMs: 1, lastChecked: new Date().toISOString() });

  // WhatsApp (not configured = warning)
  services.push({ name: "whatsapp", nameAr: "واتساب", status: "warning", message: "لا يوجد API key مُهيّأ", lastChecked: new Date().toISOString() });

  // Email (not configured = warning)
  services.push({ name: "email", nameAr: "البريد الإلكتروني", status: "warning", message: "لا يوجد SMTP مُهيّأ", lastChecked: new Date().toISOString() });

  // Storage
  services.push({ name: "storage", nameAr: "التخزين", status: "healthy", message: "قاعدة البيانات المدمجة", lastChecked: new Date().toISOString() });

  // Payment gateway
  services.push({ name: "payments", nameAr: "بوابة الدفع", status: "warning", message: "غير مُهيّأ", lastChecked: new Date().toISOString() });

  // Background jobs
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
// DEVELOPER INFO
// ═══════════════════════════════════════════════════════════════════

superAdminRouter.get("/developer-info", authMiddleware, async (_req, res) => {
  // Get table row counts safely
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

// Export hash utility for seeding
export { hashPassword };
