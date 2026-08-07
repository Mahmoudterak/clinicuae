import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, adminUsersTable } from "@workspace/db";
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

/** Seed default admin if table is empty */
async function ensureDefaultAdmin() {
  const rows = await db.select().from(adminUsersTable).limit(1);
  if (rows.length === 0) {
    await db.insert(adminUsersTable).values({
      username: "admin",
      password: "admin123",
      name: "System Administrator",
    });
  }
}

router.get("/admin-users", async (_req, res): Promise<void> => {
  await ensureDefaultAdmin();
  const rows = await db.select().from(adminUsersTable);
  res.json(ListAdminUsersResponse.parse(rows.map(iso)));
});

router.post("/admin-users", async (req, res): Promise<void> => {
  const parsed = CreateAdminUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  // Check for duplicate username
  const existing = await db
    .select()
    .from(adminUsersTable)
    .where(eq(adminUsersTable.username, parsed.data.username))
    .limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "Username already exists" });
    return;
  }
  const [row] = await db.insert(adminUsersTable).values(parsed.data).returning();
  res.status(201).json(CreateAdminUserResponse.parse(iso(row!)));
});

router.put("/admin-users/:id", async (req, res): Promise<void> => {
  const params = UpdateAdminUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateAdminUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  // Check for duplicate username (if changing username)
  if (parsed.data.username) {
    const existing = await db
      .select()
      .from(adminUsersTable)
      .where(eq(adminUsersTable.username, parsed.data.username))
      .limit(1);
    if (existing.length > 0 && existing[0]!.id !== params.data.id) {
      res.status(409).json({ error: "Username already exists" });
      return;
    }
  }
  const [row] = await db
    .update(adminUsersTable)
    .set(parsed.data)
    .where(eq(adminUsersTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(UpdateAdminUserResponse.parse(iso(row)));
});

router.delete("/admin-users/:id", async (req, res): Promise<void> => {
  const params = DeleteAdminUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  // Prevent deleting last admin
  const all = await db.select().from(adminUsersTable);
  if (all.length <= 1) {
    res.status(400).json({ error: "Cannot delete the last admin user" });
    return;
  }
  await db.delete(adminUsersTable).where(eq(adminUsersTable.id, params.data.id));
  res.status(204).send();
});

router.post("/admin-users/validate", async (req, res): Promise<void> => {
  const parsed = ValidateAdminBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  await ensureDefaultAdmin();
  const rows = await db
    .select()
    .from(adminUsersTable)
    .where(eq(adminUsersTable.username, parsed.data.username))
    .limit(1);
  const user = rows[0];
  if (!user || user.password !== parsed.data.password) {
    res.status(401).json({ valid: false, user: null });
    return;
  }
  res.json(ValidateAdminResponse.parse({ valid: true, user: iso(user) }));
});

export default router;
