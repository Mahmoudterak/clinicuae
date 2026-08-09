import { Router, type IRouter } from "express";
import { eq, and, desc, type SQL } from "drizzle-orm";
import { db, staffTable, departmentsTable } from "@workspace/db";
import { requireClinic } from "../middlewares/adminAuth";
import {
  ListStaffQueryParams,
  ListStaffResponse,
  CreateStaffMemberBody,
  CreateStaffMemberResponse,
  UpdateStaffMemberParams,
  UpdateStaffMemberBody,
  UpdateStaffMemberResponse,
  DeleteStaffMemberParams,
} from "@workspace/api-zod";
import { iso } from "../lib/serialize";

const router: IRouter = Router();
router.use(requireClinic);

async function withDept(rows: (typeof staffTable.$inferSelect)[]) {
  const depts = await db.select().from(departmentsTable);
  const dMap = new Map(depts.map((d) => [d.id, d.name]));
  return rows.map((r) => ({
    ...iso(r),
    departmentName: r.departmentId ? (dMap.get(r.departmentId) ?? null) : null,
  }));
}

router.get("/staff", async (req, res): Promise<void> => {
  const query = ListStaffQueryParams.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: query.error.message }); return; }
  const filters: SQL[] = [eq(staffTable.clinicId, req.clinicId!)];
  if (query.data.departmentId !== undefined) filters.push(eq(staffTable.departmentId, query.data.departmentId));
  if (query.data.status) filters.push(eq(staffTable.status, query.data.status));
  const rows = await db
    .select()
    .from(staffTable)
    .where(and(...filters))
    .orderBy(desc(staffTable.createdAt));
  res.json(ListStaffResponse.parse(await withDept(rows)));
});

router.post("/staff", async (req, res): Promise<void> => {
  const parsed = CreateStaffMemberBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db
    .insert(staffTable)
    .values({ ...parsed.data, clinicId: req.clinicId })
    .returning();
  const [r] = await withDept([row!]);
  res.status(201).json(CreateStaffMemberResponse.parse(r));
});

router.patch("/staff/:id", async (req, res): Promise<void> => {
  const params = UpdateStaffMemberParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateStaffMemberBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db
    .update(staffTable)
    .set(parsed.data)
    .where(and(eq(staffTable.clinicId, req.clinicId!), eq(staffTable.id, params.data.id)))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  const [r] = await withDept([row]);
  res.json(UpdateStaffMemberResponse.parse(r));
});

router.delete("/staff/:id", async (req, res): Promise<void> => {
  const params = DeleteStaffMemberParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [row] = await db
    .delete(staffTable)
    .where(and(eq(staffTable.clinicId, req.clinicId!), eq(staffTable.id, params.data.id)))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.sendStatus(204);
});

export default router;
