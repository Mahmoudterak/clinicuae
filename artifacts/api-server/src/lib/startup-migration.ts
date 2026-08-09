/**
 * Idempotent startup migration.
 * Runs raw SQL with IF NOT EXISTS / ADD COLUMN IF NOT EXISTS guards so the
 * API server self-provisions required schema on every fresh database — no
 * separate migration step needed.
 */
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { ObjectStorageService } from "./objectStorage";

export async function runStartupMigration(): Promise<void> {
  // patients.status — added to support active/inactive filtering
  await db.execute(sql`
    ALTER TABLE patients ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
  `);

  // Zapier webhooks table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS zapier_webhooks (
      id            serial PRIMARY KEY,
      name          text NOT NULL,
      event         text NOT NULL,
      webhook_url   text NOT NULL,
      active        boolean NOT NULL DEFAULT true,
      description   text,
      last_fired_at timestamptz,
      created_at    timestamptz NOT NULL DEFAULT now()
    )
  `);

  // Zapier delivery logs table (no patient payload stored — PII-free)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS zapier_logs (
      id          serial PRIMARY KEY,
      webhook_id  integer NOT NULL,
      event       text NOT NULL,
      payload     text,
      status_code text,
      success     boolean NOT NULL DEFAULT false,
      created_at  timestamptz NOT NULL DEFAULT now()
    )
  `);

  // Retry tracking columns for zapier_logs (idempotent adds)
  await db.execute(sql`
    ALTER TABLE zapier_logs ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0
  `);
  await db.execute(sql`
    ALTER TABLE zapier_logs ADD COLUMN IF NOT EXISTS final_outcome text
  `);

  // Migrate base64 logos to GCS object storage (one-time, idempotent)
  await migrateBase64LogosToStorage();
}

/**
 * Finds all clinic_settings rows where logo_data_url starts with "data:",
 * uploads each blob to GCS, and replaces the column value with the object path.
 * Safe to run repeatedly — rows already migrated won't start with "data:".
 */
async function migrateBase64LogosToStorage(): Promise<void> {
  const rows = await db.execute<{ id: number; logo_data_url: string }>(sql`
    SELECT id, logo_data_url
    FROM clinic_settings
    WHERE logo_data_url LIKE 'data:%'
  `);

  if (rows.rows.length === 0) return;

  const storageService = new ObjectStorageService();

  for (const row of rows.rows) {
    try {
      const dataUrl = row.logo_data_url;

      // Parse "data:<mime>;base64,<data>"
      const commaIndex = dataUrl.indexOf(',');
      if (commaIndex === -1) continue;

      const header = dataUrl.slice(0, commaIndex); // e.g. "data:image/png;base64"
      const base64Data = dataUrl.slice(commaIndex + 1);

      const mimeMatch = header.match(/^data:([^;]+)/);
      const contentType = mimeMatch ? mimeMatch[1] : 'image/png';

      const buffer = Buffer.from(base64Data, 'base64');
      const objectPath = await storageService.uploadLogoObject(buffer, contentType);

      await db.execute(sql`
        UPDATE clinic_settings
        SET logo_data_url = ${objectPath}
        WHERE id = ${row.id}
      `);

      console.log(`[startup-migration] Migrated logo for clinic_settings id=${row.id} → ${objectPath}`);
    } catch (err) {
      // Log but don't fail the whole migration — a single bad row shouldn't block startup
      console.error(`[startup-migration] Failed to migrate logo for clinic_settings id=${row.id}:`, err);
    }
  }
}
