import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
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

router.get("/admin-users", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(adminUsersTable)
    .where(eq(adminUsersTable.clinicId, req.clinicId!));
  // Strip password from response
  res.json(ListAdminUsersResponse.parse(rows.map(r => iso({ ...r, password: undefined }))));
});

router.post("/admin-users", async (req, res): Promise<void> => {
  const parsed = CreateAdminUserBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const existing = await db
    .select()
    .from(adminUsersTable)
    .where(and(eq(adminUsersTable.clinicId, req.clinicId!), eq(adminUsersTable.username, parsed.data.username)))
    .limit(1);
  if (existing.length > 0) { res.status(409).json({ error: "Username already exists" }); return; }
  const [row] = await db
    .insert(adminUsersTable)
    .values({ ...parsed.data, clinicId: req.clinicId })
    .returning();
  res.status(201).json(CreateAdminUserResponse.parse(iso({ ...row!, password: undefined })));
});

router.put("/admin-users/:id", async (req, res): Promise<void> => {
  const params = UpdateAdminUserParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateAdminUserBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db
    .update(adminUsersTable)
    .set(parsed.data)
    .where(and(eq(adminUsersTable.clinicId, req.clinicId!), eq(adminUsersTable.id, params.data.id)))
    .returning();
  if (!row) { res.status(404).json({ error: "Admin user not found" }); return; }
  res.json(UpdateAdminUserResponse.parse(iso({ ...row, password: undefined })));
});

router.delete("/admin-users/:id", async (req, res): Promise<void> => {
  const params = DeleteAdminUserParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
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
  if (!admin || admin.password !== parsed.data.password) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  res.json(ValidateAdminResponse.parse(iso({ ...admin, password: undefined })));
});

export default router;
