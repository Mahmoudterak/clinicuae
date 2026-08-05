import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, doctorsTable } from "@workspace/db";
import {
  ListDoctorsResponse,
  CreateDoctorBody,
  CreateDoctorResponse,
  GetDoctorParams,
  GetDoctorResponse,
  UpdateDoctorParams,
  UpdateDoctorBody,
  UpdateDoctorResponse,
  DeleteDoctorParams,
} from "@workspace/api-zod";
import { iso } from "../lib/serialize";

const router: IRouter = Router();

router.get("/doctors", async (_req, res): Promise<void> => {
  const rows = await db.select().from(doctorsTable).orderBy(desc(doctorsTable.createdAt));
  res.json(ListDoctorsResponse.parse(rows.map(iso)));
});

router.post("/doctors", async (req, res): Promise<void> => {
  const parsed = CreateDoctorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(doctorsTable).values(parsed.data).returning();
  res.status(201).json(CreateDoctorResponse.parse(iso(row)));
});

router.get("/doctors/:id", async (req, res): Promise<void> => {
  const params = GetDoctorParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db.select().from(doctorsTable).where(eq(doctorsTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Doctor not found" });
    return;
  }
  res.json(GetDoctorResponse.parse(iso(row)));
});

router.patch("/doctors/:id", async (req, res): Promise<void> => {
  const params = UpdateDoctorParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateDoctorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .update(doctorsTable)
    .set(parsed.data)
    .where(eq(doctorsTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Doctor not found" });
    return;
  }
  res.json(UpdateDoctorResponse.parse(iso(row)));
});

router.delete("/doctors/:id", async (req, res): Promise<void> => {
  const params = DeleteDoctorParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db.delete(doctorsTable).where(eq(doctorsTable.id, params.data.id)).returning();
  if (!row) {
    res.status(404).json({ error: "Doctor not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
