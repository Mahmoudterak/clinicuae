/**
 * Idempotent startup migration.
 * Runs raw SQL with IF NOT EXISTS / ADD COLUMN IF NOT EXISTS guards so the
 * API server self-provisions required schema on every fresh database — no
 * separate migration step needed.
 */
import { db, adminUsersTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { ObjectStorageService } from "./objectStorage";
import bcrypt from "bcryptjs";

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

  // Demo requests — landing page lead capture
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS demo_requests (
      id             serial PRIMARY KEY,
      name           text NOT NULL,
      clinic_name    text NOT NULL,
      phone          text NOT NULL,
      preferred_time text,
      status         text NOT NULL DEFAULT 'new',
      created_at     timestamptz NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS demo_requests_status_idx ON demo_requests (status)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS demo_requests_created_idx ON demo_requests (created_at)
  `);

  // Migrate base64 logos to object storage (one-time, idempotent)
  await migrateBase64LogosToStorage();

  // ── Admin password hashing ───────────────────────────────────────────────────
  // Hash every plaintext password in admin_users before serving any traffic.
  // This is idempotent: bcrypt hashes start with "$2", so already-hashed rows
  // are skipped.
  const BCRYPT_ROUNDS = 10;
  const isBcryptHash = (v: string) => /^\$2[aby]\$\d{2}\$/.test(v);

  const admins = await db.select().from(adminUsersTable);

  for (const admin of admins) {
    if (!isBcryptHash(admin.password)) {
      const hashed = await bcrypt.hash(admin.password, BCRYPT_ROUNDS);
      await db
        .update(adminUsersTable)
        .set({ password: hashed })
        .where(sql`id = ${admin.id}`);
    }
  }

  // ── Default admin bootstrap ──────────────────────────────────────────────────
  // Only runs when the table is completely empty (fresh deployment).
  // Requires ADMIN_PASSWORD env var — no fallback to a guessable default.
  if (admins.length === 0) {
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminUsername = process.env.ADMIN_USERNAME ?? "admin";
    if (!adminPassword) {
      console.warn(
        "[startup] admin_users table is empty but ADMIN_PASSWORD is not set. " +
        "No default admin was created. Set ADMIN_PASSWORD to bootstrap a first admin account."
      );
    } else {
      const hashed = await bcrypt.hash(adminPassword, BCRYPT_ROUNDS);
      await db.insert(adminUsersTable).values({
        username: adminUsername,
        password: hashed,
        name: "System Administrator",
      });
      console.info("[startup] Default admin account created.");
    }
  }
}

/**
 * Finds all clinic_settings rows where logo_data_url starts with "data:",
 * uploads each blob to object storage, and replaces the column value with
 * the object path. Safe to run repeatedly — migrated rows won't start with "data:".
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

      const header = dataUrl.slice(0, commaIndex);
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
