import { Router, type IRouter } from "express";
import jwt from "jsonwebtoken";
import { eq, asc } from "drizzle-orm";
import { db, adminUsersTable, registeredClinicsTable } from "@workspace/db";
import { logSecurityEvent } from "../lib/securityLogger";
import { requireClinic } from "../middlewares/adminAuth";
import bcrypt from "bcryptjs";

const router: IRouter = Router();

const JWT_SECRET = process.env.SESSION_SECRET ?? "dev-secret-change-me";
const BCRYPT_ROUNDS = 10;
const ADMIN_USER = process.env.ADMIN_USERNAME ?? "admin";
const adminPass = process.env.ADMIN_PASSWORD;

/**
 * Resolve the clinic for the env-var admin in single-tenant / dev mode.
 *
 * Multi-tenant guard: if multiple clinics exist and CLINIC_ID is not
 * explicitly set, we refuse rather than silently attaching to an arbitrary
 * tenant.  This prevents the legacy env-var credential from accidentally
 * gaining access to the wrong clinic in a production multi-tenant database.
 *
 * Returns the clinic ID to embed in the JWT, or null if the env-var admin
 * cannot be safely scoped to a single clinic.
 */
async function resolveEnvAdminClinicId(): Promise<number | null> {
  // 1. Explicit override always wins
  const envId = process.env.CLINIC_ID ? parseInt(process.env.CLINIC_ID, 10) : null;
  if (envId && !isNaN(envId)) return envId;

  // 2. Count registered clinics
  const clinics = await db
    .select({ id: registeredClinicsTable.id })
    .from(registeredClinicsTable)
    .orderBy(asc(registeredClinicsTable.id))
    .limit(2); // only need to know if 0, 1, or many

  if (clinics.length === 0) {
    // Fresh database — create the default clinic
    const [created] = await db
      .insert(registeredClinicsTable)
      .values({ name: "Default Clinic", ownerName: "System Admin", phone: "0000000000", plan: "trial", status: "active" })
      .returning({ id: registeredClinicsTable.id });
    return created!.id;
  }

  if (clinics.length === 1) {
    // Single-tenant mode — safe to use the only clinic
    return clinics[0]!.id;
  }

  // Multiple clinics and no explicit CLINIC_ID — refuse to guess
  return null;
}

/** Detect whether a stored value is already a bcrypt hash */
function isBcryptHash(value: string): boolean {
  return /^\$2[aby]\$\d{2}\$/.test(value);
}

router.post("/auth/login", async (req, res): Promise<void> => {
  const { username, password } = (req.body ?? {}) as { username?: string; password?: string };

  if (!username || !password) {
    res.status(400).json({ error: "Username and password required" });
    return;
  }

  // ── 1. Try DB admin lookup (per-clinic multi-tenant) ──────────────────────
  try {
    const [admin] = await db
      .select()
      .from(adminUsersTable)
      .where(eq(adminUsersTable.username, username))
      .limit(1);

    if (admin) {
      // bcrypt comparison with migration path for legacy plain-text passwords
      let passwordMatch: boolean;
      if (isBcryptHash(admin.password)) {
        passwordMatch = await bcrypt.compare(password, admin.password);
      } else {
        passwordMatch = admin.password === password;
        if (passwordMatch) {
          const newHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
          await db.update(adminUsersTable).set({ password: newHash }).where(eq(adminUsersTable.id, admin.id));
        }
      }

      if (!passwordMatch || admin.status === "suspended") {
        await logSecurityEvent({
          req,
          eventType: "login_failure",
          description: `Failed login attempt for admin "${username}"`,
          clinicId: admin.clinicId,
          adminId: admin.id,
          success: false,
          metadata: { reason: !passwordMatch ? "wrong_password" : "account_suspended" },
        });
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

      // Update last login timestamp
      await db
        .update(adminUsersTable)
        .set({ lastLoginAt: new Date() })
        .where(eq(adminUsersTable.id, admin.id));

      const token = jwt.sign(
        { role: "admin", clinicId: admin.clinicId, adminId: admin.id, adminName: username },
        JWT_SECRET,
        { expiresIn: "24h" },
      );

      await logSecurityEvent({
        req,
        eventType: "login_success",
        description: `Admin "${admin.name}" logged in`,
        clinicId: admin.clinicId,
        adminId: admin.id,
        success: true,
      });

      res.json({ token, role: "admin", name: admin.name, clinicId: admin.clinicId });
      return;
    }
  } catch (dbErr) {
    console.error("[auth] DB lookup failed, falling back to env vars:", dbErr);
  }

  // ── 2. Env-var fallback (single-tenant / legacy mode) ────────────────────
  if (!adminPass) {
    await logSecurityEvent({
      req,
      eventType: "login_failure",
      description: `Login attempt for "${username}" — server not configured`,
      success: false,
    });
    res.status(503).json({ error: "Server not configured — ADMIN_PASSWORD not set" });
    return;
  }

  if (username === ADMIN_USER) {
    const envPasswordMatch = isBcryptHash(adminPass)
      ? await bcrypt.compare(password, adminPass)
      : password === adminPass;

    if (envPasswordMatch) {
      // Resolve to a real clinicId — returns null when multiple clinics exist
      // without an explicit CLINIC_ID to avoid attaching to an arbitrary tenant
      const clinicId = await resolveEnvAdminClinicId();
      if (clinicId === null) {
        await logSecurityEvent({
          req,
          eventType: "login_failure",
          description: `Env-var admin "${username}" login rejected — multiple clinics exist and CLINIC_ID is not set`,
          success: false,
        });
        res.status(403).json({
          error: "Multi-tenant mode detected — set CLINIC_ID to use env-var admin credentials",
        });
        return;
      }

      // Seed this env-var admin into DB so future logins use the DB path
      try {
        const [existing] = await db
          .select({ id: adminUsersTable.id })
          .from(adminUsersTable)
          .where(eq(adminUsersTable.username, username))
          .limit(1);
        if (!existing) {
          const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
          await db.insert(adminUsersTable).values({
            username,
            password: passwordHash,
            name: "System Admin",
            clinicId,
            role: "admin",
            status: "active",
          });
        }
      } catch { /* non-fatal */ }

      const token = jwt.sign(
        { role: "admin", clinicId, adminName: username },
        JWT_SECRET,
        { expiresIn: "24h" },
      );

      await logSecurityEvent({
        req,
        eventType: "login_success",
        description: `Env-var admin "${username}" logged in`,
        clinicId,
        success: true,
      });

      res.json({ token, role: "admin", name: "System Admin", clinicId });
      return;
    }
  }

  await logSecurityEvent({
    req,
    eventType: "login_failure",
    description: `Failed login attempt for "${username}"`,
    success: false,
  });
  res.status(401).json({ error: "Invalid credentials" });
});

// ── Change password (authenticated clinic admin) ──────────────────────────────
router.post("/auth/change-password", requireClinic, async (req, res): Promise<void> => {
  const { currentPassword, newPassword } = (req.body ?? {}) as { currentPassword?: string; newPassword?: string };
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "currentPassword and newPassword are required" });
    return;
  }
  if (newPassword.length < 6) {
    res.status(400).json({ error: "New password must be at least 6 characters" });
    return;
  }

  // Look up by adminName (username) + clinicId — both are embedded in the JWT by requireClinic
  const adminName = (req as any).adminJwt?.adminName;
  const clinicId  = (req as any).clinicId;
  if (!adminName || !clinicId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const [admin] = await db
    .select()
    .from(adminUsersTable)
    .where(eq(adminUsersTable.username, adminName))
    .limit(1);

  if (!admin || admin.clinicId !== clinicId) {
    res.status(404).json({ error: "Admin account not found" });
    return;
  }

  // Verify current password (bcrypt or legacy plaintext)
  let currentMatch = false;
  if (isBcryptHash(admin.password)) {
    currentMatch = await bcrypt.compare(currentPassword, admin.password);
  } else {
    currentMatch = admin.password === currentPassword;
  }

  if (!currentMatch) {
    await logSecurityEvent({
      req,
      eventType: "login_failure",
      description: `Wrong current password during change-password for "${adminName}"`,
      clinicId: admin.clinicId,
      adminId: admin.id,
      success: false,
      metadata: { reason: "wrong_current_password" },
    });
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }

  const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await db.update(adminUsersTable).set({ password: newHash }).where(eq(adminUsersTable.id, admin.id));

  res.json({ success: true });
});

export default router;
