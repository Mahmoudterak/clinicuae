import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";

const router: IRouter = Router();

type ServiceStatus = "ok" | "error" | "unconfigured";

interface ServiceCheck {
  status: ServiceStatus;
  message?: string;
}

async function checkDatabase(): Promise<ServiceCheck> {
  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    return { status: "ok" };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Connection failed" };
  }
}

function checkStorage(): ServiceCheck {
  return process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID
    ? { status: "ok" }
    : { status: "unconfigured", message: "Object storage bucket not configured" };
}

function checkAuthentication(): ServiceCheck {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret === "dev-secret-change-me") {
    return { status: "unconfigured", message: "SESSION_SECRET not set for production" };
  }
  return { status: "ok" };
}

function checkEmail(): ServiceCheck {
  const hasProvider =
    process.env.SENDGRID_API_KEY ||
    process.env.RESEND_API_KEY ||
    process.env.SMTP_HOST;
  return hasProvider
    ? { status: "ok" }
    : { status: "unconfigured", message: "No email provider configured" };
}

function checkWhatsApp(): ServiceCheck {
  return process.env.WHATSAPP_PHONE_ID && process.env.WHATSAPP_ACCESS_TOKEN
    ? { status: "ok" }
    : { status: "unconfigured", message: "WhatsApp credentials not configured" };
}

function checkPayments(): ServiceCheck {
  const hasProvider = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_PUBLISHABLE_KEY;
  return hasProvider
    ? { status: "ok" }
    : { status: "unconfigured", message: "No payment provider configured" };
}

function checkBackgroundJobs(): ServiceCheck {
  // Zapier webhook delivery runs in-process (fire-and-forget async).
  // If the server is up, background jobs are up.
  return { status: "ok" };
}

router.get("/healthz", async (_req, res) => {
  const [database] = await Promise.all([checkDatabase()]);

  const services = {
    api:            { status: "ok" as ServiceStatus },
    database,
    storage:        checkStorage(),
    authentication: checkAuthentication(),
    email:          checkEmail(),
    whatsapp:       checkWhatsApp(),
    payments:       checkPayments(),
    backgroundJobs: checkBackgroundJobs(),
  };

  const hasError = Object.values(services).some((s) => s.status === "error");
  const overallStatus = hasError ? "degraded" : "ok";

  res.json({
    status: overallStatus,
    checkedAt: new Date().toISOString(),
    services,
  });
});

export default router;
