import healthRouter from "./health";
import patientsRouter from "./patients";
import doctorsRouter from "./doctors";
import appointmentsRouter from "./appointments";
import medicalRecordsRouter from "./medicalRecords";
import prescriptionsRouter from "./prescriptions";
import invoicesRouter from "./invoices";
import dashboardRouter from "./dashboard";
import labRequestsRouter from "./labRequests";
import radiologyRequestsRouter from "./radiologyRequests";
import medicationsRouter from "./medications";
import inventoryRouter from "./inventoryItems";
import departmentsRouter from "./departments";
import staffRouter from "./staff";
import paymentsRouter from "./payments";
import insuranceRouter from "./insuranceRecords";
import whatsappRouter from "./whatsapp";
import bookingsRouter from "./onlineBookings";
import zapierRouter from "./zapier";
import settingsRouter from "./settings";
import adminUsersRouter from "./adminUsers";
import doctorAuthRouter from "./doctorAuth";
import { superAdminRouter } from "./superAdmin";
import authRouter from "./auth";
import patientAuthRouter from "./patientAuth";
import branchesRouter from "./branches";
import storageRouter from "./storage";
import demoRequestsRouter from "./demoRequests";
import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { adminAuth } from "../middlewares/adminAuth";

const router: IRouter = Router();

// ── Super-admin routes FIRST — they carry their own auth guard and must
//    never be intercepted by the clinic-level requireClinic middleware that
//    every other router applies globally via router.use(requireClinic).
router.use("/superadmin", superAdminRouter);

/**
 * Routes that do NOT require admin authentication.
 * Everything else is protected by the adminAuth guard below.
 */
const PUBLIC_EXACT: Record<string, string[]> = {
  "/healthz":                 ["GET"],
  "/auth/login":              ["POST"],
  "/admin-users/validate":    ["POST"],
  "/patient-auth/login":      ["POST"],
  "/patient/me":              ["GET"],   // protected separately by patientAuth middleware
  "/doctor-auth/login":       ["POST"],
  "/demo-requests":           ["POST"],
};

function selectiveAdminAuth(req: Request, res: Response, next: NextFunction): void {
  const path = req.path;

  // Allow all /public/* routes (online booking portal)
  if (path.startsWith("/public/")) { next(); return; }

  // Allow explicitly listed public endpoints
  const allowed = PUBLIC_EXACT[path];
  if (allowed && allowed.includes(req.method)) { next(); return; }

  // Everything else requires an admin JWT
  adminAuth(req, res, next);
}

// Apply selective auth before all clinic routes
router.use(selectiveAdminAuth);

// Public-capable routers FIRST — before any clinic-scoped router that applies requireClinic globally
router.use(authRouter);
router.use(healthRouter);
router.use(patientAuthRouter);
router.use(doctorAuthRouter);
router.use(patientsRouter);
router.use(doctorsRouter);
router.use(appointmentsRouter);
router.use(medicalRecordsRouter);
router.use(prescriptionsRouter);
router.use(invoicesRouter);
router.use(dashboardRouter);
router.use(labRequestsRouter);
router.use(radiologyRequestsRouter);
router.use(medicationsRouter);
router.use(inventoryRouter);
router.use(departmentsRouter);
router.use(staffRouter);
router.use(paymentsRouter);
router.use(insuranceRouter);
router.use(whatsappRouter);
router.use(bookingsRouter);
router.use(zapierRouter);
router.use(settingsRouter);
router.use(adminUsersRouter);
router.use(branchesRouter);
router.use(storageRouter);
router.use(demoRequestsRouter);

export default router;
