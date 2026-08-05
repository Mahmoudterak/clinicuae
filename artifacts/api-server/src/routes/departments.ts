import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, departmentsTable } from "@workspace/db";
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

router.get("/departments", async (_req, res): Promise<void> => {
  const rows = await db.select().from(departmentsTable).orderBy(desc(departmentsTable.createdAt));
  res.json(ListDepartmentsResponse.parse(rows.map(iso)));
});

router.post("/departments", async (req, res): Promise<void> => {
  const parsed = CreateDepartmentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.insert(departmentsTable).values(parsed.data).returning();
  res.status(201).json(CreateDepartmentResponse.parse(iso(row!)));
});

router.patch("/departments/:id", async (req, res): Promise<void> => {
  const params = UpdateDepartmentParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateDepartmentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.update(departmentsTable).set(parsed.data).where(eq(departmentsTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(UpdateDepartmentResponse.parse(iso(row)));
});

router.delete("/departments/:id", async (req, res): Promise<void> => {
  const params = DeleteDepartmentParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [row] = await db.delete(departmentsTable).where(eq(departmentsTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.sendStatus(204);
});

export default router;
