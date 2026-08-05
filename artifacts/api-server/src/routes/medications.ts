import { Router, type IRouter } from "express";
import { eq, and, desc, type SQL } from "drizzle-orm";
import { db, medicationsTable } from "@workspace/db";
import {
  ListMedicationsQueryParams,
  ListMedicationsResponse,
  CreateMedicationBody,
  CreateMedicationResponse,
  UpdateMedicationParams,
  UpdateMedicationBody,
  UpdateMedicationResponse,
  DeleteMedicationParams,
} from "@workspace/api-zod";
import { iso } from "../lib/serialize";

const router: IRouter = Router();

router.get("/medications", async (req, res): Promise<void> => {
  const query = ListMedicationsQueryParams.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: query.error.message }); return; }
  const filters: SQL[] = [];
  if (query.data.status) filters.push(eq(medicationsTable.status, query.data.status));
  if (query.data.category) filters.push(eq(medicationsTable.category, query.data.category));
  const rows = await db.select().from(medicationsTable).where(filters.length ? and(...filters) : undefined).orderBy(desc(medicationsTable.createdAt));
  res.json(ListMedicationsResponse.parse(rows.map(iso)));
});

router.post("/medications", async (req, res): Promise<void> => {
  const parsed = CreateMedicationBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.insert(medicationsTable).values(parsed.data).returning();
  res.status(201).json(CreateMedicationResponse.parse(iso(row!)));
});

router.patch("/medications/:id", async (req, res): Promise<void> => {
  const params = UpdateMedicationParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateMedicationBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.update(medicationsTable).set(parsed.data).where(eq(medicationsTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(UpdateMedicationResponse.parse(iso(row)));
});

router.delete("/medications/:id", async (req, res): Promise<void> => {
  const params = DeleteMedicationParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [row] = await db.delete(medicationsTable).where(eq(medicationsTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.sendStatus(204);
});

export default router;
