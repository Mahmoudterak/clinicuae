import { Router, type IRouter } from "express";
import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import {
  db,
  patientsTable,
  doctorsTable,
  appointmentsTable,
  invoicesTable,
  medicalRecordsTable,
  prescriptionsTable,
} from "@workspace/db";
import {
  GetDashboardSummaryResponse,
  GetRecentActivityResponse,
  GetAppointmentsByDayResponse,
  GetRevenueByMonthResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const today = isoDate(new Date());
  const monthStart = today.slice(0, 8) + "01";

  const [{ count: totalPatients }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(patientsTable);
  const [{ count: totalDoctors }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(doctorsTable);
  const [{ count: appointmentsToday }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(appointmentsTable)
    .where(eq(appointmentsTable.date, today));
  const [{ count: upcomingAppointments }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(appointmentsTable)
    .where(and(gte(appointmentsTable.date, today), sql`${appointmentsTable.status} NOT IN ('cancelled','completed')`));
  const [{ count: pendingInvoices }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(invoicesTable)
    .where(sql`${invoicesTable.status} IN ('pending','overdue')`);
  const [{ total: revenueThisMonth }] = await db
    .select({ total: sql<number>`coalesce(sum(${invoicesTable.amount}), 0)::float` })
    .from(invoicesTable)
    .where(and(eq(invoicesTable.status, "paid"), gte(invoicesTable.issuedDate, monthStart)));
  const [{ total: outstandingAmount }] = await db
    .select({ total: sql<number>`coalesce(sum(${invoicesTable.amount}), 0)::float` })
    .from(invoicesTable)
    .where(sql`${invoicesTable.status} IN ('pending','overdue')`);

  res.json(
    GetDashboardSummaryResponse.parse({
      totalPatients,
      totalDoctors,
      appointmentsToday,
      upcomingAppointments,
      pendingInvoices,
      revenueThisMonth,
      outstandingAmount,
    }),
  );
});

router.get("/dashboard/activity", async (_req, res): Promise<void> => {
  const [patients, appointments, records, prescriptions, invoices] = await Promise.all([
    db.select().from(patientsTable).orderBy(desc(patientsTable.createdAt)).limit(5),
    db.select().from(appointmentsTable).orderBy(desc(appointmentsTable.createdAt)).limit(5),
    db.select().from(medicalRecordsTable).orderBy(desc(medicalRecordsTable.createdAt)).limit(5),
    db.select().from(prescriptionsTable).orderBy(desc(prescriptionsTable.createdAt)).limit(5),
    db.select().from(invoicesTable).orderBy(desc(invoicesTable.createdAt)).limit(5),
  ]);
  const pNames = new Map(patients.map((p) => [p.id, `${p.firstName} ${p.lastName}`]));
  const allPatients = await db.select().from(patientsTable);
  for (const p of allPatients) pNames.set(p.id, `${p.firstName} ${p.lastName}`);

  const items = [
    ...patients.map((p) => ({
      id: `patient-${p.id}`,
      type: "patient",
      description: `New patient registered: ${p.firstName} ${p.lastName}`,
      timestamp: p.createdAt.toISOString(),
    })),
    ...appointments.map((a) => ({
      id: `appointment-${a.id}`,
      type: "appointment",
      description: `Appointment ${a.status} for ${pNames.get(a.patientId) ?? "patient"} on ${a.date} at ${a.time}`,
      timestamp: a.createdAt.toISOString(),
    })),
    ...records.map((r) => ({
      id: `record-${r.id}`,
      type: "record",
      description: `Medical record added for ${pNames.get(r.patientId) ?? "patient"}: ${r.diagnosis}`,
      timestamp: r.createdAt.toISOString(),
    })),
    ...prescriptions.map((r) => ({
      id: `prescription-${r.id}`,
      type: "prescription",
      description: `Prescription issued for ${pNames.get(r.patientId) ?? "patient"}: ${r.medication}`,
      timestamp: r.createdAt.toISOString(),
    })),
    ...invoices.map((i) => ({
      id: `invoice-${i.id}`,
      type: "invoice",
      description: `Invoice ${i.status} for ${pNames.get(i.patientId) ?? "patient"}: $${i.amount.toFixed(2)}`,
      timestamp: i.createdAt.toISOString(),
    })),
  ]
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
    .slice(0, 12);

  res.json(GetRecentActivityResponse.parse(items));
});

router.get("/dashboard/appointments-by-day", async (_req, res): Promise<void> => {
  const start = new Date();
  start.setDate(start.getDate() - 13);
  const startStr = isoDate(start);
  const rows = await db
    .select({ date: appointmentsTable.date, count: sql<number>`count(*)::int` })
    .from(appointmentsTable)
    .where(gte(appointmentsTable.date, startStr))
    .groupBy(appointmentsTable.date);
  const map = new Map(rows.map((r) => [r.date, r.count]));
  const out: { date: string; count: number }[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = isoDate(d);
    out.push({ date: key, count: map.get(key) ?? 0 });
  }
  res.json(GetAppointmentsByDayResponse.parse(out));
});

router.get("/dashboard/revenue-by-month", async (_req, res): Promise<void> => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const startStr = isoDate(start);
  const rows = await db
    .select({
      month: sql<string>`to_char(${invoicesTable.issuedDate}::date, 'YYYY-MM')`,
      revenue: sql<number>`coalesce(sum(${invoicesTable.amount}), 0)::float`,
    })
    .from(invoicesTable)
    .where(and(eq(invoicesTable.status, "paid"), gte(invoicesTable.issuedDate, startStr)))
    .groupBy(sql`to_char(${invoicesTable.issuedDate}::date, 'YYYY-MM')`);
  const map = new Map(rows.map((r) => [r.month, r.revenue]));
  const out: { month: string; revenue: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    out.push({ month: key, revenue: map.get(key) ?? 0 });
  }
  res.json(GetRevenueByMonthResponse.parse(out));
});

export default router;
