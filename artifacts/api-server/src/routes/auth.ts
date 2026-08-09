import { Router, type IRouter } from "express";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db, adminUsersTable } from "@workspace/db";
import { logSecurityEvent } from "../lib/securityLogger";
import bcrypt from "bcryptjs";

const router: IRouter = Router();

const JWT_SECRET = process.env.SESSION_SECRET ?? "dev-secret-change-me";
const BCRYPT_ROUNDS = 10;
const ADMIN_USER = process.env.ADMIN_USERNAME ?? "admin";
const adminPass = process.env.ADMIN_PASSWORD;

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
      const clinicId = process.env.CLINIC_ID ? parseInt(process.env.CLINIC_ID, 10) : undefined;
      const token = jwt.sign(
        { role: "admin", clinicId, adminName: username },
        JWT_SECRET,
        { expiresIn: "24h" },
      );

      await logSecurityEvent({
        req,
        eventType: "login_success",
        description: `Env-var admin "${username}" logged in`,
        clinicId: clinicId ?? null,
        success: true,
      });

      res.json({ token, role: "admin", name: "System Admin", clinicId: clinicId ?? null });
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
