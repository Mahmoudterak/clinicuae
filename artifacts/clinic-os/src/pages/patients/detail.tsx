import { useParams, Link } from "wouter";
import { useState } from "react";
import {
  useGetPatientSummary,
  getGetPatientSummaryQueryKey,
} from "@workspace/api-client-react";
import { useTranslation } from "@/i18n/context";
import {
  Phone,
  Mail,
  MapPin,
  AlertCircle,
  FileText,
  Pill,
  Receipt,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar,
  Activity,
  User,
  ClipboardList,
  Stethoscope,
  CreditCard,
} from "lucide-react";
import { format, parseISO, differenceInYears } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import { Button } from "@/components/ui/button";

type Section = "records" | "prescriptions" | "invoices" | "appointments";

export default function PatientDetail() {
  const { id } = useParams();
  const patientId = Number(id);
  const { t, isRtl } = useTranslation();
  const locale = isRtl ? arLocale : enUS;
  const [section, setSection] = useState<Section>("records");

  const ChevronBack = isRtl ? ChevronRight : ChevronLeft;

  const { data: summary, isLoading, error } = useGetPatientSummary(patientId, {
    query: { enabled: !!patientId, queryKey: getGetPatientSummaryQueryKey(patientId) },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-destructive">{t("patientDetail.notFound")}</h2>
        <p className="text-muted-foreground mt-2">{t("patientDetail.notFoundDesc")}</p>
        <Link href="/patients">
          <Button variant="outline" className="mt-4">{t("patientDetail.backToDirectory")}</Button>
        </Link>
      </div>
    );
  }

  const { patient, appointments, records, prescriptions, invoices } = summary;

  const age = patient.dateOfBirth
    ? differenceInYears(new Date(), parseISO(patient.dateOfBirth))
    : null;

  const latestRecord = records[0];
  const latestAppointment = appointments[0];

  const navItems: { key: Section; label: string; icon: React.ReactNode; count: number }[] = [
    { key: "records",       label: t("patientDetail.records"),       icon: <ClipboardList className="h-4 w-4" />, count: records.length },
    { key: "prescriptions", label: t("patientDetail.prescriptions"), icon: <Pill className="h-4 w-4" />,         count: prescriptions.length },
    { key: "invoices",      label: t("patientDetail.invoices"),      icon: <CreditCard className="h-4 w-4" />,   count: invoices.length },
    { key: "appointments",  label: t("patientDetail.appointments"),  icon: <Calendar className="h-4 w-4" />,     count: appointments.length },
  ];

  return (
    <div className="flex flex-col h-full -m-6">
      {/* ── Breadcrumb bar ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-6 py-3 border-b bg-background text-sm text-muted-foreground">
        <Link href="/patients" className="flex items-center gap-1 hover:text-foreground transition-colors">
          <ChevronBack className="h-4 w-4" />
          {t("patientDetail.backToDirectory")}
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{patient.firstName} {patient.lastName}</span>
        {latestAppointment && (
          <>
            <span>/</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-medium">
              {t("patientDetail.upcomingLatest")}
            </span>
          </>
        )}
      </div>

      {/* ── Main split layout ─────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* LEFT PANEL */}
        <aside className="w-56 shrink-0 border-e bg-muted/30 dark:bg-slate-900/60 flex flex-col overflow-y-auto">
          {/* Patient card */}
          <div className="p-4 border-b">
            <div className="flex flex-col items-center text-center gap-2 pb-3">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xl font-bold shadow-lg ring-4 ring-background">
                {patient.firstName[0]}{patient.lastName[0]}
              </div>
              <div>
                <p className="font-semibold text-sm leading-tight">{patient.firstName} {patient.lastName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {patient.gender && <span className="capitalize">{patient.gender}</span>}
                  {age !== null && <span>, {age} {isRtl ? "سنة" : "yrs"}</span>}
                </p>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">PT-{patient.id.toString().padStart(4, "0")}</p>
              </div>
            </div>

            {/* Contact */}
            <div className="space-y-1.5 text-xs text-muted-foreground">
              {patient.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
                  <span dir="ltr" className="text-foreground">{patient.phone}</span>
                </div>
              )}
              {patient.email && (
                <div className="flex items-center gap-2 overflow-hidden">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
                  <span className="truncate text-foreground" dir="ltr">{patient.email}</span>
                </div>
              )}
              {patient.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-indigo-400" />
                  <span className="text-foreground">{patient.address}</span>
                </div>
              )}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-1 mt-3 text-center">
              {[
                { label: isRtl ? "مواعيد" : "Visits",  val: appointments.length },
                { label: isRtl ? "سجلات"  : "Records", val: records.length },
                { label: isRtl ? "وصفات"  : "Rx",      val: prescriptions.length },
              ].map(s => (
                <div key={s.label} className="bg-background dark:bg-slate-800 rounded-lg py-1.5">
                  <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{s.val}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Allergy warning */}
          {patient.allergies && (
            <div className="mx-3 mt-3 bg-destructive/10 border border-destructive/20 rounded-lg p-2.5 text-xs flex gap-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-destructive" />
              <div>
                <p className="font-semibold text-destructive">{t("patients.allergies")}</p>
                <p className="text-muted-foreground mt-0.5">{patient.allergies}</p>
              </div>
            </div>
          )}

          {/* Blood type badge */}
          {patient.bloodType && (
            <div className="mx-3 mt-2 flex items-center justify-between bg-rose-500/10 rounded-lg px-3 py-2 text-xs">
              <span className="text-muted-foreground">{t("patients.bloodType")}</span>
              <span className="font-bold text-rose-600">{patient.bloodType}</span>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 p-2 mt-2 space-y-0.5">
            {navItems.map(item => (
              <button
                key={item.key}
                onClick={() => setSection(item.key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all text-start ${
                  section === item.key
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span className={section === item.key ? "text-white" : "text-indigo-400"}>{item.icon}</span>
                <span className="flex-1 font-medium">{item.label}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  section === item.key ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                }`}>{item.count}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 overflow-y-auto bg-background">

          {/* Visit header banner */}
          {latestAppointment && (
            <div className="border-b px-6 py-3 flex items-center gap-4 bg-indigo-50/50 dark:bg-indigo-950/20">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Stethoscope className="h-4 w-4 text-indigo-500" />
                <span className="text-indigo-700 dark:text-indigo-300">{latestAppointment.reason}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span dir="ltr">{latestAppointment.time}</span>
                <span>·</span>
                <span>{format(parseISO(latestAppointment.date), "MMM d, yyyy", { locale })}</span>
              </div>
              <div className="ms-auto flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{t("common.doctor")} {latestAppointment.doctorName}</span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  latestAppointment.status === "completed" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                  latestAppointment.status === "scheduled" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {t(`status.${latestAppointment.status}`)}
                </span>
              </div>
            </div>
          )}

          <div className="p-6 space-y-6">

            {/* ── RECORDS ──────────────────────────────────────────── */}
            {section === "records" && (
              <div className="space-y-4">
                {/* Latest record highlight */}
                {latestRecord && (
                  <div className="border rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-white">
                        <FileText className="h-4 w-4" />
                        <span className="font-semibold text-sm">{latestRecord.diagnosis}</span>
                      </div>
                      <span className="text-indigo-200 text-xs">
                        {format(parseISO(latestRecord.visitDate), "MMM d, yyyy", { locale })}
                      </span>
                    </div>
                    <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-5 bg-card">
                      {[
                        { label: t("patientDetail.symptoms"), value: latestRecord.symptoms, icon: <Activity className="h-4 w-4 text-amber-500" /> },
                        { label: t("patientDetail.treatment"), value: latestRecord.treatment, icon: <Stethoscope className="h-4 w-4 text-emerald-500" /> },
                        { label: t("patientDetail.attending"), value: `${t("common.doctor")} ${latestRecord.doctorName}`, icon: <User className="h-4 w-4 text-indigo-500" /> },
                      ].map(f => (
                        <div key={f.label} className="space-y-1.5">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            {f.icon}
                            <span>{f.label}</span>
                          </div>
                          <p className="text-sm font-medium">{f.value || t("common.unknown")}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* All records */}
                {records.length > 1 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ps-1">
                      {isRtl ? "السجلات السابقة" : "Previous Records"}
                    </h3>
                    {records.slice(1).map(record => (
                      <div key={record.id} className="border rounded-xl bg-card hover:border-indigo-300 transition-colors">
                        <div className="flex items-center gap-4 px-5 py-4">
                          <div className="h-9 w-9 rounded-full bg-indigo-50 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
                            <FileText className="h-4 w-4 text-indigo-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm">{record.diagnosis}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{record.symptoms}</p>
                          </div>
                          <div className="text-end shrink-0">
                            <p className="text-xs text-muted-foreground">{format(parseISO(record.visitDate), "MMM d, yyyy", { locale })}</p>
                            <p className="text-xs text-indigo-500 mt-0.5">{t("common.doctor")} {record.doctorName}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {records.length === 0 && (
                  <EmptyState icon={<FileText className="h-10 w-10" />} message={t("patientDetail.noRecords")} />
                )}
              </div>
            )}

            {/* ── PRESCRIPTIONS ─────────────────────────────────────── */}
            {section === "prescriptions" && (
              <div className="space-y-3">
                {prescriptions.length === 0
                  ? <EmptyState icon={<Pill className="h-10 w-10" />} message={t("patientDetail.noPrescriptions")} />
                  : prescriptions.map(rx => (
                    <div key={rx.id} className="border rounded-xl bg-card hover:border-indigo-300 transition-colors overflow-hidden">
                      <div className="flex items-center gap-1 px-4 py-2 bg-muted/40 border-b">
                        <Pill className="h-3.5 w-3.5 text-violet-500" />
                        <span className="text-xs font-medium text-muted-foreground">{t("common.doctor")} {rx.doctorName}</span>
                        <span className="ms-auto text-xs text-muted-foreground">{format(parseISO(rx.createdAt), "MMM d, yyyy", { locale })}</span>
                      </div>
                      <div className="p-4">
                        <p className="font-semibold">{rx.medication}</p>
                        <div className="grid grid-cols-3 gap-3 mt-3">
                          {[
                            { label: t("patientDetail.dosage"),     value: rx.dosage },
                            { label: t("patientDetail.frequency"),  value: rx.frequency },
                            { label: t("patientDetail.duration"),   value: rx.durationDays ? `${rx.durationDays}d` : "—" },
                          ].map(f => (
                            <div key={f.label} className="bg-muted/50 rounded-lg p-2.5 text-center">
                              <p className="text-[10px] text-muted-foreground">{f.label}</p>
                              <p className="text-sm font-semibold mt-0.5">{f.value}</p>
                            </div>
                          ))}
                        </div>
                        {rx.instructions && (
                          <p className="text-xs text-muted-foreground mt-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                            {rx.instructions}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                }
              </div>
            )}

            {/* ── INVOICES ──────────────────────────────────────────── */}
            {section === "invoices" && (
              <div className="space-y-3">
                {invoices.length === 0
                  ? <EmptyState icon={<Receipt className="h-10 w-10" />} message={t("patientDetail.noInvoices")} />
                  : invoices.map(inv => (
                    <div key={inv.id} className="border rounded-xl bg-card hover:border-indigo-300 transition-colors p-4 flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                        inv.status === "paid"    ? "bg-emerald-100 dark:bg-emerald-900/40" :
                        inv.status === "overdue" ? "bg-destructive/10" : "bg-amber-100 dark:bg-amber-900/40"
                      }`}>
                        {inv.status === "paid"    ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> :
                         inv.status === "overdue" ? <XCircle className="h-5 w-5 text-destructive" />     :
                                                    <Clock className="h-5 w-5 text-amber-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{inv.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 font-mono">INV-{inv.id.toString().padStart(5, "0")} · {format(parseISO(inv.issuedDate), "MMM d, yyyy", { locale })}</p>
                      </div>
                      <div className="text-end shrink-0">
                        <p className="text-lg font-bold" dir="ltr">{new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(inv.amount)}</p>
                        <span className={`text-xs font-medium ${
                          inv.status === "paid"    ? "text-emerald-600" :
                          inv.status === "overdue" ? "text-destructive" : "text-amber-600"
                        }`}>{t(`status.${inv.status}`)}</span>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}

            {/* ── APPOINTMENTS ──────────────────────────────────────── */}
            {section === "appointments" && (
              <div className="space-y-3">
                {appointments.length === 0
                  ? <EmptyState icon={<Calendar className="h-10 w-10" />} message={t("patientDetail.noAppointments")} />
                  : appointments.map(apt => (
                    <div key={apt.id} className="border rounded-xl bg-card hover:border-indigo-300 transition-colors p-4 flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold ${
                        apt.status === "completed" ? "bg-emerald-500" :
                        apt.status === "scheduled" ? "bg-indigo-500" :
                        apt.status === "cancelled" ? "bg-slate-400" : "bg-amber-500"
                      }`}>
                        {format(parseISO(apt.date), "dd", { locale })}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{apt.reason}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(parseISO(apt.date), "MMMM d, yyyy", { locale })}
                          {" · "}{apt.time}
                          {" · "}{t("common.doctor")} {apt.doctorName}
                        </p>
                      </div>
                      <span className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${
                        apt.status === "completed" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                        apt.status === "scheduled" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                        apt.status === "cancelled" ? "bg-muted text-muted-foreground" :
                        "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      }`}>
                        {t(`status.${apt.status}`)}
                      </span>
                    </div>
                  ))
                }
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
      <div className="opacity-20">{icon}</div>
      <p className="text-sm">{message}</p>
    </div>
  );
}
