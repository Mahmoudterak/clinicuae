/**
 * Idempotent startup migration.
 * Runs raw SQL with IF NOT EXISTS / ADD COLUMN IF NOT EXISTS guards so the
 * API server self-provisions required schema on every fresh database — no
 * separate migration step needed.
 */
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

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
}
