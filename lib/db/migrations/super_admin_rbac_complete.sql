-- ============================================================
-- Super Admin RBAC — Complete Idempotent Migration
-- Covers every table the Super Admin feature depends on.
-- Safe to run on both a clean database and an existing one.
-- Apply with: psql $DATABASE_URL -f this_file.sql
--             OR via drizzle-kit push (pnpm --filter @workspace/db run push-force)
-- ============================================================

-- ── registered_clinics ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS registered_clinics (
  id             SERIAL PRIMARY KEY,
  name           TEXT    NOT NULL,
  owner_name     TEXT    NOT NULL,
  phone          TEXT    NOT NULL,
  email          TEXT,
  specialty      TEXT,
  plan           TEXT    NOT NULL DEFAULT 'trial',
  status         TEXT    NOT NULL DEFAULT 'trial',
  trial_start_at TIMESTAMPTZ DEFAULT NOW(),
  trial_end_at   TIMESTAMPTZ,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── super_admin_users ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS super_admin_users (
  id            SERIAL PRIMARY KEY,
  username      TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  name          TEXT    NOT NULL,
  role          TEXT    NOT NULL DEFAULT 'super_admin',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add role column to pre-existing installations
ALTER TABLE super_admin_users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'super_admin';

-- Backfill existing rows (sets every pre-RBAC account to super_admin explicitly)
UPDATE super_admin_users
  SET role = 'super_admin'
  WHERE role IS NULL OR role = '';

-- Enforce allowed values at the database level
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'super_admin_users' AND constraint_name = 'super_admin_users_role_check'
  ) THEN
    ALTER TABLE super_admin_users
      ADD CONSTRAINT super_admin_users_role_check
      CHECK (role IN ('super_admin','platform_admin','support_admin','billing_admin','developer'));
  END IF;
END $$;

-- ── platform_audit_logs ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_audit_logs (
  id             SERIAL PRIMARY KEY,
  actor_id       INTEGER,
  actor_username TEXT,
  actor_name     TEXT,
  action         TEXT NOT NULL,
  resource_type  TEXT,
  resource_id    TEXT,
  resource_label TEXT,
  tenant_id      INTEGER,
  tenant_name    TEXT,
  ip             TEXT,
  user_agent     TEXT,
  previous_value JSONB,
  new_value      JSONB,
  metadata       JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS platform_audit_logs_created_at_idx
  ON platform_audit_logs (created_at DESC);

-- ── subscription_plans ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscription_plans (
  id            SERIAL PRIMARY KEY,
  slug          TEXT    NOT NULL UNIQUE,
  name          TEXT    NOT NULL,
  name_ar       TEXT    NOT NULL,
  description   TEXT,
  monthly_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  annual_price  NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency      TEXT    NOT NULL DEFAULT 'AED',
  trial_days    INTEGER NOT NULL DEFAULT 14,
  max_doctors   INTEGER DEFAULT 1,
  max_staff     INTEGER DEFAULT 5,
  max_patients  INTEGER DEFAULT 500,
  max_branches  INTEGER DEFAULT 1,
  storage_gb    INTEGER DEFAULT 5,
  features      JSONB   NOT NULL DEFAULT '["patients","appointments","invoices","prescriptions","reports"]',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  is_popular    BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── feature_flags ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feature_flags (
  id          SERIAL PRIMARY KEY,
  key         TEXT    NOT NULL UNIQUE,
  name        TEXT    NOT NULL,
  name_ar     TEXT    NOT NULL,
  description TEXT,
  enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  category    TEXT    NOT NULL DEFAULT 'feature',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  TEXT
);

-- ── clinic_feature_flags ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS clinic_feature_flags (
  id         SERIAL PRIMARY KEY,
  clinic_id  INTEGER NOT NULL,
  flag_key   TEXT    NOT NULL,
  enabled    BOOLEAN NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS clinic_feature_flags_clinic_flag_idx
  ON clinic_feature_flags (clinic_id, flag_key);

-- ── platform_settings ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_settings (
  id          SERIAL PRIMARY KEY,
  key         TEXT NOT NULL UNIQUE,
  value       TEXT NOT NULL DEFAULT '',
  label       TEXT,
  description TEXT,
  category    TEXT NOT NULL DEFAULT 'general',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  TEXT
);
