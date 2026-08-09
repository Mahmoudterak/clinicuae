import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, departmentsTable } from "@workspace/db";
import { requireClinic } from "../middlewares/adminAuth";
import {
  ListDepartmentsResponse,
  CreateDepartmentBody,
  CreateDepartmentResponse,
  UpdateDepartmentParams,
  UpdateDepartmentBody,
  UpdateDepartmentResponse,
  DeleteDepartmentParams,
} from "@workspace/api-zod";
import { iso } from "../lib/serialize";

const router: IRouter = Router();
router.use(requireClinic);

router.get("/departments", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(departmentsTable)
    .where(eq(departmentsTable.clinicId, req.clinicId!))
    .orderBy(desc(departmentsTable.createdAt));
  res.json(ListDepartmentsResponse.parse(rows.map(iso)));
});

router.post("/departments", async (req, res): Promise<void> => {
  const parsed = CreateDepartmentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db
    .insert(departmentsTable)
    .values({ ...parsed.data, clinicId: req.clinicId })
    .returning();
  res.status(201).json(CreateDepartmentResponse.parse(iso(row!)));
});

router.patch("/departments/:id", async (req, res): Promise<void> => {
  const params = UpdateDepartmentParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateDepartmentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db
    .update(departmentsTable)
    .set(parsed.data)
    .where(and(eq(departmentsTable.clinicId, req.clinicId!), eq(departmentsTable.id, params.data.id)))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(UpdateDepartmentResponse.parse(iso(row)));
});

router.delete("/departments/:id", async (req, res): Promise<void> => {
  const params = DeleteDepartmentParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [row] = await db
    .delete(departmentsTable)
    .where(and(eq(departmentsTable.clinicId, req.clinicId!), eq(departmentsTable.id, params.data.id)))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.sendStatus(204);
});

export default router;
