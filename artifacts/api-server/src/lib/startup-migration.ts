/**
 * Idempotent startup migration.
 * Runs raw SQL with IF NOT EXISTS / ADD COLUMN IF NOT EXISTS guards so the
 * API server self-provisions required schema on every fresh database — no
 * separate migration step needed.
 */
import { db, adminUsersTable, superAdminUsersTable, whatsappTemplatesTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { ObjectStorageService } from "./objectStorage";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// ── scrypt helpers (same algorithm as superAdmin.ts) ──────────────────────────
function scryptHash(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(password, salt, 64, (err, key) => {
      if (err) reject(err);
      else resolve(`${salt}:${key.toString("hex")}`);
    });
  });
}

// ── Logo migration status (in-memory, reset on each server start) ─────────────

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

  // clinic_settings.clinic_id — added to support multi-tenant settings isolation
  await db.execute(sql`
    ALTER TABLE clinic_settings ADD COLUMN IF NOT EXISTS clinic_id integer
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

  // ── Super Admin bootstrap ────────────────────────────────────────────────────
  // Seeds a default super_admin account if the table is empty.
  // Uses SUPER_ADMIN_USERNAME / SUPER_ADMIN_PASSWORD env vars when set,
  // otherwise falls back to sensible defaults and logs them clearly.
  await seedSuperAdmin();

  // ── WhatsApp template seeds ──────────────────────────────────────────────────
  await seedWhatsAppTemplates();
}

const DEFAULT_SA_USERNAME = "superadmin";
const DEFAULT_SA_PASSWORD = "Clinic@OS2024";

async function seedSuperAdmin(): Promise<void> {
  const existing = await db.select({ id: superAdminUsersTable.id }).from(superAdminUsersTable).limit(1);
  if (existing.length > 0) return; // already seeded

  const username = process.env.SUPER_ADMIN_USERNAME ?? DEFAULT_SA_USERNAME;
  const password = process.env.SUPER_ADMIN_PASSWORD ?? DEFAULT_SA_PASSWORD;
  const hash = await scryptHash(password);

  await db.insert(superAdminUsersTable).values({
    username,
    passwordHash: hash,
    name: "Super Admin",
    role: "super_admin",
  });

  console.info("╔══════════════════════════════════════════════════════╗");
  console.info("║          SUPER ADMIN ACCOUNT CREATED                 ║");
  console.info(`║  Username : ${username.padEnd(40)}║`);
  console.info(`║  Password : ${password.padEnd(40)}║`);
  console.info("║  ⚠ Change these credentials after first login!       ║");
  console.info("╚══════════════════════════════════════════════════════╝");
}

// Default medical WhatsApp templates (Arabic + English, bilingual)
const DEFAULT_WA_TEMPLATES = [
  {
    name:      "Appointment Reminder",
    nameAr:    "تذكير بالموعد",
    type:      "reminder",
    variables: ["name", "date", "time"],
    active:    "true",
    body:
      "Hello {{name}} 👋\n\nThis is a friendly reminder for your appointment on *{{date}}* at *{{time}}*.\n\nPlease arrive 10 minutes early. If you need to reschedule, contact us as soon as possible.\n\nWe look forward to seeing you!",
    bodyAr:
      "مرحباً {{name}} 👋\n\nنذكرك بموعدك يوم *{{date}}* الساعة *{{time}}*.\n\nيرجى الحضور قبل 10 دقائق. إذا أردت تغيير الموعد، تواصل معنا في أقرب وقت.\n\nنتطلع لرؤيتك! 😊",
  },
  {
    name:      "Appointment Confirmed",
    nameAr:    "تأكيد الموعد",
    type:      "reminder",
    variables: ["name", "date", "time", "doctor"],
    active:    "true",
    body:
      "Dear {{name}},\n\nYour appointment has been *confirmed* ✅\n\n📅 Date : {{date}}\n🕐 Time : {{time}}\n👨‍⚕️ Doctor: {{doctor}}\n\nSee you soon!",
    bodyAr:
      "عزيزي {{name}}،\n\nتم *تأكيد* موعدك ✅\n\n📅 التاريخ: {{date}}\n🕐 الوقت : {{time}}\n👨‍⚕️ الطبيب : {{doctor}}\n\nنراك قريباً!",
  },
  {
    name:      "Post-Visit Follow-up",
    nameAr:    "متابعة بعد الزيارة",
    type:      "followup",
    variables: ["name"],
    active:    "true",
    body:
      "Hello {{name}},\n\nWe hope you're feeling better after your visit today 🌟\n\nIf you have any questions about your treatment or medication, feel free to contact us anytime.\n\nTake care!",
    bodyAr:
      "مرحباً {{name}}،\n\nنتمنى أن تكون بصحة جيدة بعد زيارتك اليوم 🌟\n\nإذا كان لديك أي استفسار عن العلاج أو الأدوية، لا تتردد في التواصل معنا في أي وقت.\n\nدُم بصحة وعافية!",
  },
  {
    name:      "Prescription Ready",
    nameAr:    "الوصفة الطبية جاهزة",
    type:      "followup",
    variables: ["name"],
    active:    "true",
    body:
      "Hello {{name}} 💊\n\nYour prescription is ready for pickup.\n\nPlease visit the pharmacy at your convenience. Remember to take your medication as directed by your doctor.",
    bodyAr:
      "مرحباً {{name}} 💊\n\nوصفتك الطبية جاهزة للاستلام.\n\nيمكنك التوجه إلى الصيدلية في أي وقت. تذكر تناول دوائك حسب تعليمات الطبيب.",
  },
  {
    name:      "Special Offer",
    nameAr:    "عرض خاص",
    type:      "offer",
    variables: ["name", "offer"],
    active:    "true",
    body:
      "🎉 Dear {{name}},\n\nWe have a *special offer* just for you!\n\n{{offer}}\n\nDon't miss out — limited time only. Contact us to book your appointment.",
    bodyAr:
      "🎉 عزيزي {{name}}،\n\nلدينا *عرض خاص* لك!\n\n{{offer}}\n\nلا تفوّت الفرصة — العرض لفترة محدودة. تواصل معنا لحجز موعدك.",
  },
];

async function seedWhatsAppTemplates(): Promise<void> {
  const existing = await db.select({ id: whatsappTemplatesTable.id }).from(whatsappTemplatesTable).limit(1);
  if (existing.length > 0) return; // already seeded

  await db.insert(whatsappTemplatesTable).values(DEFAULT_WA_TEMPLATES);
  console.info(`[startup] Seeded ${DEFAULT_WA_TEMPLATES.length} default WhatsApp templates.`);
}

/**
 * Finds all clinic_settings rows where logo_data_url starts with "data:",
 * uploads each blob to GCS, and replaces the column value with the object path.
 * Safe to run repeatedly — rows already migrated won't start with "data:".
 *
 * Individual failures are recorded in getLogoMigrationStatus() so the Super Admin
 * can see exactly which clinic_settings rows need a manual fix. A warning is
 * printed to stderr after the loop so the failure is never silently swallowed.
 */
async function migrateBase64LogosToStorage(): Promise<void> {
  const rows = await db.execute<{ id: number; logo_data_url: string }>(sql`
    SELECT id, logo_data_url
    FROM clinic_settings
    WHERE logo_data_url LIKE 'data:%'
  `);

  _logoMigrationResult = {
    ranAt: new Date().toISOString(),
    found: rows.rows.length,
    migrated: 0,
    failures: [],
    hasRun: true,
  };

  if (rows.rows.length === 0) {
    console.log("[startup-migration] No base64 logos found — nothing to migrate.");
    return;
  }

  console.log(`[startup-migration] Found ${rows.rows.length} base64 logo(s) to migrate.`);

  const storageService = new ObjectStorageService();

  for (const row of rows.rows) {
    try {
      const dataUrl = row.logo_data_url;

      // Parse "data:<mime>;base64,<data>"
      const commaIndex = dataUrl.indexOf(',');
      if (commaIndex === -1) {
        throw new Error("Malformed data URL — no comma separator found");
      }

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

      _logoMigrationResult.migrated += 1;
      console.log(`[startup-migration] Migrated logo for clinic_settings id=${row.id} → ${objectPath}`);
    } catch (err: any) {
      const errorMessage = err?.message ?? String(err);
      _logoMigrationResult.failures.push({ clinicSettingsId: row.id, error: errorMessage });
      // Log immediately so the failure appears in server logs at the exact point it happens
      console.error(`[startup-migration] FAILED to migrate logo for clinic_settings id=${row.id}: ${errorMessage}`);
    }
  }

  // Surface failures prominently so they are never silently ignored
  if (_logoMigrationResult.failures.length > 0) {
    console.error(
      `[startup-migration] WARNING: ${_logoMigrationResult.failures.length} logo(s) could not be migrated. ` +
      `These clinic_settings rows still contain base64 data and need manual attention: ` +
      _logoMigrationResult.failures.map(f => `id=${f.clinicSettingsId} (${f.error})`).join(", ")
    );
  } else {
    console.log(`[startup-migration] All ${_logoMigrationResult.migrated} logo(s) migrated successfully.`);
  }
}

export interface LogoMigrationResult {
  /** ISO timestamp when the migration ran */
  ranAt: string | null;
  /** Number of base64 rows found at startup */
  found: number;
  /** Number successfully uploaded and replaced */
  migrated: number;
  /** Details of rows that failed — never silently swallowed */
  failures: Array<{ clinicSettingsId: number; error: string }>;
  /** Whether the migration has run at least once this server lifetime */
  hasRun: boolean;
}

let _logoMigrationResult: LogoMigrationResult = {
  ranAt: null,
  found: 0,
  migrated: 0,
  failures: [],
  hasRun: false,
};

/** Returns the result of the last logo migration run (reset on server restart). */
export function getLogoMigrationStatus(): LogoMigrationResult {
  return { ..._logoMigrationResult, failures: [..._logoMigrationResult.failures] };
}
