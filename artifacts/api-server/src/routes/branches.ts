import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, branchesTable } from "@workspace/db";
import { z } from "zod";
import { requireClinic } from "../middlewares/adminAuth";

const router: IRouter = Router();
router.use(requireClinic);

const BranchBody = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  managerName: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  notes: z.string().optional(),
});

router.get("/branches", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(branchesTable)
    .where(eq(branchesTable.clinicId, req.clinicId!))
    .orderBy(branchesTable.createdAt);
  res.json(rows);
});

router.post("/branches", async (req, res): Promise<void> => {
  const parsed = BranchBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db
    .insert(branchesTable)
    .values({ ...parsed.data, clinicId: req.clinicId, updatedAt: new Date() })
    .returning();
  res.status(201).json(row);
});

router.patch("/branches/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = BranchBody.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db
    .update(branchesTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(branchesTable.clinicId, req.clinicId!), eq(branchesTable.id, id)))
    .returning();
  if (!row) { res.status(404).json({ error: "Branch not found" }); return; }
  res.json(row);
});

router.delete("/branches/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db
    .delete(branchesTable)
    .where(and(eq(branchesTable.clinicId, req.clinicId!), eq(branchesTable.id, id)));
  res.sendStatus(204);
});

export default router;
