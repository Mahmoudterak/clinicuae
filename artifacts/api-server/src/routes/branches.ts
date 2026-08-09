import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, branchesTable } from "@workspace/db";
import { z } from "zod";
import { adminAuth } from "../middlewares/adminAuth";

const router: IRouter = Router();

const BranchBody = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  managerName: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  notes: z.string().optional(),
});

// GET /branches
router.get("/branches", adminAuth, async (_req, res): Promise<void> => {
  const rows = await db.select().from(branchesTable).orderBy(branchesTable.createdAt);
  res.json(rows);
});

// POST /branches
router.post("/branches", adminAuth, async (req, res): Promise<void> => {
  const parsed = BranchBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.insert(branchesTable).values({
    ...parsed.data,
    updatedAt: new Date(),
  }).returning();
  res.status(201).json(row);
});

// PATCH /branches/:id
router.patch("/branches/:id", adminAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = BranchBody.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.update(branchesTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(branchesTable.id, id))
    .returning();
  if (!row) { res.status(404).json({ error: "Branch not found" }); return; }
  res.json(row);
});

// DELETE /branches/:id
router.delete("/branches/:id", adminAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(branchesTable).where(eq(branchesTable.id, id));
  res.sendStatus(204);
});

export default router;
