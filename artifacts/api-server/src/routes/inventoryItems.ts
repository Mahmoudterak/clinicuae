import { Router, type IRouter } from "express";
import { eq, and, desc, type SQL } from "drizzle-orm";
import { db, inventoryTable } from "@workspace/db";
import {
  ListInventoryQueryParams,
  ListInventoryResponse,
  CreateInventoryItemBody,
  CreateInventoryItemResponse,
  UpdateInventoryItemParams,
  UpdateInventoryItemBody,
  UpdateInventoryItemResponse,
  DeleteInventoryItemParams,
} from "@workspace/api-zod";
import { iso } from "../lib/serialize";

const router: IRouter = Router();

router.get("/inventory", async (req, res): Promise<void> => {
  const query = ListInventoryQueryParams.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: query.error.message }); return; }
  const filters: SQL[] = [];
  if (query.data.status) filters.push(eq(inventoryTable.status, query.data.status));
  if (query.data.category) filters.push(eq(inventoryTable.category, query.data.category));
  const rows = await db.select().from(inventoryTable).where(filters.length ? and(...filters) : undefined).orderBy(desc(inventoryTable.createdAt));
  res.json(ListInventoryResponse.parse(rows.map(iso)));
});

router.post("/inventory", async (req, res): Promise<void> => {
  const parsed = CreateInventoryItemBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.insert(inventoryTable).values(parsed.data).returning();
  res.status(201).json(CreateInventoryItemResponse.parse(iso(row!)));
});

router.patch("/inventory/:id", async (req, res): Promise<void> => {
  const params = UpdateInventoryItemParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateInventoryItemBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.update(inventoryTable).set(parsed.data).where(eq(inventoryTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(UpdateInventoryItemResponse.parse(iso(row)));
});

router.delete("/inventory/:id", async (req, res): Promise<void> => {
  const params = DeleteInventoryItemParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [row] = await db.delete(inventoryTable).where(eq(inventoryTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.sendStatus(204);
});

export default router;
