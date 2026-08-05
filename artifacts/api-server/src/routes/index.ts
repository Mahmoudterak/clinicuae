import { Router, type IRouter } from "express";
import healthRouter from "./health";
import patientsRouter from "./patients";
import doctorsRouter from "./doctors";
import appointmentsRouter from "./appointments";
import medicalRecordsRouter from "./medicalRecords";
import prescriptionsRouter from "./prescriptions";
import invoicesRouter from "./invoices";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(patientsRouter);
router.use(doctorsRouter);
router.use(appointmentsRouter);
router.use(medicalRecordsRouter);
router.use(prescriptionsRouter);
router.use(invoicesRouter);
router.use(dashboardRouter);

export default router;
