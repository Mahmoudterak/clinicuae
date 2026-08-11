import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, adminUsersTable } from "@workspace/db";
import { requireClinic } from "../middlewares/adminAuth";
import {
  ListAdminUsersResponse,
  CreateAdminUserBody,
  CreateAdminUserResponse,
  UpdateAdminUserParams,
  UpdateAdminUserBody,
  UpdateAdminUserResponse,
  DeleteAdminUserParams,
  ValidateAdminBody,
  ValidateAdminResponse,
} from "@workspace/api-zod";
import { iso } from "../lib/serialize";

const router: IRouter = Router();
router.use(requireClinic);

const BCRYPT_ROUNDS = 10;

/** Detect whether a stored value is already a bcrypt hash */
function isBcryptHash(value: string): boolean {
  return /^\$2[aby]\$\d{2}\$/.test(value);
}

/** Strip the password field before sending to client */
function sanitize(row: typeof adminUsersTable.$inferSelect) {
  const { password: _omit, ...safe } = row;
  return safe;
}

router.get("/admin-users", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(adminUsersTable)
    .where(eq(adminUsersTable.clinicId, req.clinicId!));
  res.json(ListAdminUsersResponse.parse(rows.map(r => iso(sanitize(r)))));
});

router.post("/admin-users", async (req, res): Promise<void> => {
  const parsed = CreateAdminUserBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  // Check uniqueness within this clinic (also catches the global DB constraint)
  const existing = await db
    .select()
    .from(adminUsersTable)
    .where(eq(adminUsersTable.username, parsed.data.username))
    .limit(1);
  if (existing.length > 0) { res.status(409).json({ error: "Username already exists" }); return; }
  const hashed = await bcrypt.hash(parsed.data.password, BCRYPT_ROUNDS);
  try {
    const [row] = await db
      .insert(adminUsersTable)
      .values({ ...parsed.data, password: hashed, clinicId: req.clinicId })
      .returning();
    res.status(201).json(CreateAdminUserResponse.parse(iso(sanitize(row!))));
  } catch (err: unknown) {
    // Handle DB-level unique violation (e.g. race condition)
    const msg = String((err as { message?: string })?.message ?? "");
    if (msg.includes("unique") || msg.includes("23505")) {
      res.status(409).json({ error: "Username already exists" });
    } else {
      throw err;
    }
  }
});

router.put("/admin-users/:id", async (req, res): Promise<void> => {
  const params = UpdateAdminUserParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateAdminUserBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  // Prevent a clinic admin from deactivating their own account
  if (parsed.data.status === "suspended" && req.adminId === params.data.id) {
    res.status(400).json({ error: "You cannot deactivate your own account" });
    return;
  }
  if (parsed.data.username) {
    const existing = await db
      .select()
      .from(adminUsersTable)
      .where(and(eq(adminUsersTable.clinicId, req.clinicId!), eq(adminUsersTable.username, parsed.data.username)))
      .limit(1);
    if (existing.length > 0 && existing[0]!.id !== params.data.id) {
      res.status(409).json({ error: "Username already exists" });
      return;
    }
  }
  const updates: Partial<typeof adminUsersTable.$inferInsert> = { ...parsed.data };
  if (parsed.data.password) {
    updates.password = await bcrypt.hash(parsed.data.password, BCRYPT_ROUNDS);
  }
  const [row] = await db
    .update(adminUsersTable)
    .set(updates)
    .where(and(eq(adminUsersTable.clinicId, req.clinicId!), eq(adminUsersTable.id, params.data.id)))
    .returning();
  if (!row) { res.status(404).json({ error: "Admin user not found" }); return; }
  res.json(UpdateAdminUserResponse.parse(iso(sanitize(row))));
});

router.delete("/admin-users/:id", async (req, res): Promise<void> => {
  const params = DeleteAdminUserParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  // Prevent self-deletion
  if (req.adminId === params.data.id) {
    res.status(400).json({ error: "You cannot delete your own account" });
    return;
  }
  const [row] = await db
    .delete(adminUsersTable)
    .where(and(eq(adminUsersTable.clinicId, req.clinicId!), eq(adminUsersTable.id, params.data.id)))
    .returning();
  if (!row) { res.status(404).json({ error: "Admin user not found" }); return; }
  res.sendStatus(204);
});

// Validate admin credentials (used internally by auth flow)
router.post("/admin-users/validate", async (req, res): Promise<void> => {
  const parsed = ValidateAdminBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [admin] = await db
    .select()
    .from(adminUsersTable)
    .where(and(eq(adminUsersTable.clinicId, req.clinicId!), eq(adminUsersTable.username, parsed.data.username)))
    .limit(1);
  if (!admin) {
    res.status(401).json({ valid: false, user: null });
    return;
  }

  let passwordValid: boolean;
  if (isBcryptHash(admin.password)) {
    passwordValid = await bcrypt.compare(parsed.data.password, admin.password);
  } else {
    passwordValid = admin.password === parsed.data.password;
    if (passwordValid) {
      const newHash = await bcrypt.hash(parsed.data.password, BCRYPT_ROUNDS);
      await db
        .update(adminUsersTable)
        .set({ password: newHash })
        .where(and(eq(adminUsersTable.clinicId, req.clinicId!), eq(adminUsersTable.id, admin.id)));
    }
  }

  if (!passwordValid) {
    res.status(401).json({ valid: false, user: null });
    return;
  }

  res.json(ValidateAdminResponse.parse({ valid: true, user: iso(sanitize(admin)) }));
});

export default router;
