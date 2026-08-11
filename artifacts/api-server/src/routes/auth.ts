import { Router, type IRouter } from "express";
import jwt from "jsonwebtoken";
import { eq, asc } from "drizzle-orm";
import { db, adminUsersTable, registeredClinicsTable } from "@workspace/db";
import { logSecurityEvent } from "../lib/securityLogger";
import bcrypt from "bcryptjs";

const router: IRouter = Router();

const JWT_SECRET = process.env.SESSION_SECRET ?? "dev-secret-change-me";
const BCRYPT_ROUNDS = 10;
const ADMIN_USER = process.env.ADMIN_USERNAME ?? "admin";
const adminPass = process.env.ADMIN_PASSWORD;

/**
 * Find or create a default clinic for single-tenant/dev mode.
 * Returns the clinic ID to embed in the JWT.
 */
async function getOrCreateDefaultClinicId(): Promise<number> {
  // 1. Check env override
  const envId = process.env.CLINIC_ID ? parseInt(process.env.CLINIC_ID, 10) : null;
  if (envId && !isNaN(envId)) return envId;

  // 2. Use first registered clinic
  const [existing] = await db
    .select({ id: registeredClinicsTable.id })
    .from(registeredClinicsTable)
    .orderBy(asc(registeredClinicsTable.id))
    .limit(1);
  if (existing) return existing.id;

  // 3. Create a default clinic if none exist
  const [created] = await db
    .insert(registeredClinicsTable)
    .values({ name: "Default Clinic", subdomain: "default", plan: "basic", status: "active" })
    .returning({ id: registeredClinicsTable.id });
  return created!.id;
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
        { role: "admin", userId: admin.id, clinicId: admin.clinicId, adminName: username },
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
      // Always resolve to a real clinicId so requireClinic works
      const clinicId = await getOrCreateDefaultClinicId();

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

export default router;
