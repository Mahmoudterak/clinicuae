import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, clinicSettingsTable } from "@workspace/db";
import { requireClinic } from "../middlewares/adminAuth";
import { GetSettingsResponse, UpdateSettingsBody, UpdateSettingsResponse } from "@workspace/api-zod";

const router: IRouter = Router();
router.use(requireClinic);

/** Get the clinic's settings row, creating a default if none exists. */
async function getOrCreateSettings(clinicId: number) {
  const rows = await db
    .select()
    .from(clinicSettingsTable)
    .where(eq(clinicSettingsTable.clinicId, clinicId))
    .limit(1);
  if (rows.length > 0) return rows[0]!;
  const [row] = await db
    .insert(clinicSettingsTable)
    .values({
      clinicId,
      clinicName: "Clinic OS",
      clinicNameAr: "كلينيك OS",
      address: "",
      phone: "",
      email: "",
      website: "",
      currency: "AED",
      timezone: "Asia/Dubai",
      logoDataUrl: null,
    })
    .returning();
  return row!;
}

router.get("/settings", async (req, res): Promise<void> => {
  const row = await getOrCreateSettings(req.clinicId!);
  res.json(GetSettingsResponse.parse(row));
});

router.put("/settings", async (req, res): Promise<void> => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const existing = await getOrCreateSettings(req.clinicId!);
  const [row] = await db
    .update(clinicSettingsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(clinicSettingsTable.id, existing.id))
    .returning();
  res.json(UpdateSettingsResponse.parse(row!));
});

export default router;
