import { Router, type IRouter } from "express";
import { db, demoRequestsTable } from "@workspace/db";
import { z } from "zod";

const router: IRouter = Router();

const insertDemoRequestSchema = z.object({
  name: z.string().min(1).max(200),
  clinicName: z.string().min(1).max(200),
  phone: z.string().min(7).max(30),
  preferredTime: z.string().optional(),
});

// ── POST /demo-requests ── public lead capture ────────────────────────────────
router.post("/demo-requests", async (req, res): Promise<void> => {
  const parsed = insertDemoRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [created] = await db
    .insert(demoRequestsTable)
    .values(parsed.data)
    .returning();

  res.status(201).json({ success: true, id: created.id });
});

export default router;
