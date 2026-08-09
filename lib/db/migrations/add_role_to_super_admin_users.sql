-- Migration: Add role column to super_admin_users
-- Applied via: pnpm --filter @workspace/db run push-force
-- Run this if schema push was not applied automatically:

ALTER TABLE super_admin_users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'super_admin';

-- Backfill: all existing super admins get the full super_admin role
UPDATE super_admin_users SET role = 'super_admin' WHERE role IS NULL OR role = '';
