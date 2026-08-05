import { useParams, Link } from "wouter";
import { useGetPatientSummary, getGetPatientSummaryQueryKey } from "@workspace/api-client-react";
import { useTranslation } from "@/i18n/context";
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Activity,
  AlertCircle,
  FileText,
  Pill,
  Receipt,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Loader2
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

export default function PatientDetail() {
  const { id } = useParams();
  const patientId = Number(id);
  const { t, isRtl } = useTranslation();
  const locale = isRtl ? arLocale : enUS;

  const ChevronBack = isRtl ? ChevronRight : ChevronLeft;

  const { data: summary, isLoading, error } = useGetPatientSummary(patientId, { 
    query: { enabled: !!patientId, queryKey: getGetPatientSummaryQueryKey(patientId) } 
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/patients">
          <Button variant="outline" size="icon" className="h-8 w-8">
            <ChevronBack className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{patient.firstName} {patient.lastName}</h1>
          <p className="text-sm text-muted-foreground font-mono">ID: PT-{patient.id.toString().padStart(4, '0')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="space-y-6">
          <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
            <div className="h-24 bg-gradient-to-r from-primary/20 to-blue-600/20" />
            <div className="px-6 pb-6 relative">
              <div className="absolute -top-12 h-24 w-24 rounded-xl bg-card border-4 border-card flex items-center justify-center overflow-hidden">
                <div className="h-full w-full bg-primary/10 flex items-center justify-center text-primary text-3xl font-bold">
                  {patient.firstName[0]}{patient.lastName[0]}
                </div>
              </div>
              
              <div className="pt-14 space-y-4">
                <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                  <div className="col-span-2 flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span className="text-foreground" dir="ltr">{patient.phone}</span>
                  </div>
                  {patient.email && (
                    <div className="col-span-2 flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span className="text-foreground" dir="ltr">{patient.email}</span>
                    </div>
                  )}
                  {patient.address && (
                    <div className="col-span-2 flex items-start gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                      <span className="text-foreground">{patient.address}</span>
                    </div>
                  )}
                  
                  <div className="col-span-2 h-px bg-border my-2" />

                  <div>
                    <p className="text-muted-foreground">{t("patients.gender")}</p>
                    <p className="font-medium text-foreground">{patient.gender}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t("patients.dob")}</p>
                    <p className="font-medium text-foreground">
                      {patient.dateOfBirth ? format(parseISO(patient.dateOfBirth), 'MMM d, yyyy', { locale }) : t("common.notApplicable")}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t("patients.bloodType")}</p>
                    <p className="font-medium text-rose-500">{patient.bloodType || t("common.unknown")}</p>
                  </div>
                </div>

                {patient.allergies && (
                  <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm flex gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">{t("patients.allergies")}</p>
                      <p className="mt-0.5">{patient.allergies}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {patient.notes && (
            <div className="bg-card border rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold mb-2">{t("patients.notes")}</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{patient.notes}</p>
            </div>
          )}
        </div>

        <div className="xl:col-span-2">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full justify-start h-12 bg-transparent border-b rounded-none p-0 space-x-6 overflow-x-auto flex-nowrap hide-scrollbar">
              <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-0 whitespace-nowrap">{t("patientDetail.overview")}</TabsTrigger>
              <TabsTrigger value="appointments" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-0 whitespace-nowrap">
                {t("patientDetail.appointments")} <span className="ms-2 bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full">{appointments.length}</span>
              </TabsTrigger>
              <TabsTrigger value="records" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-0 whitespace-nowrap">
                {t("patientDetail.records")} <span className="ms-2 bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full">{records.length}</span>
              </TabsTrigger>
              <TabsTrigger value="prescriptions" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-0 whitespace-nowrap">
                {t("patientDetail.prescriptions")} <span className="ms-2 bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full">{prescriptions.length}</span>
              </TabsTrigger>
              <TabsTrigger value="invoices" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-0 whitespace-nowrap">
                {t("patientDetail.invoices")} <span className="ms-2 bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full">{invoices.length}</span>
              </TabsTrigger>
            </TabsList>
            
            <div className="mt-6">
              <TabsContent value="overview" className="space-y-6 m-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-card border rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /> {t("patientDetail.upcomingLatest")}</h3>
                    </div>
                    {appointments.length > 0 ? (
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">{appointments[0].reason}</span>
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">{t(`status.${appointments[0].status}`)}</span>
                        </div>
                        <div className="text-sm text-muted-foreground flex gap-2 items-center">
                          <Clock className="h-4 w-4" /> 
                          {format(parseISO(appointments[0].date), 'MMM d, yyyy', { locale })} {appointments[0].time}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {t("common.doctor")} {appointments[0].doctorName}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">{t("patientDetail.noAppointments")}</p>
                    )}
                  </div>

                  <div className="bg-card border rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold flex items-center gap-2"><FileText className="h-4 w-4 text-cyan-500" /> {t("patientDetail.recentDiagnosis")}</h3>
                    </div>
                    {records.length > 0 ? (
                      <div className="space-y-3">
                        <div className="font-medium text-sm">{records[0].diagnosis}</div>
                        <div className="text-sm text-muted-foreground flex gap-2 items-center">
                          <Activity className="h-4 w-4 shrink-0" /> {records[0].treatment || t("common.unknown")}
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">
                          {format(parseISO(records[0].visitDate), 'MMM d, yyyy', { locale })}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">{t("patientDetail.noRecords")}</p>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="appointments" className="m-0">
                <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
                  <table className="w-full text-sm text-start">
                    <thead className="bg-muted/50 text-muted-foreground">
                      <tr>
                        <th className="px-6 py-4 font-medium">{t("common.date")} & {t("common.time")}</th>
                        <th className="px-6 py-4 font-medium">{t("common.doctor")}</th>
                        <th className="px-6 py-4 font-medium">{t("common.reason")}</th>
                        <th className="px-6 py-4 font-medium text-end">{t("common.status")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {appointments.length === 0 ? (
                        <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">{t("patientDetail.noAppointments")}</td></tr>
                      ) : (
                        appointments.map(apt => (
                          <tr key={apt.id} className="hover:bg-muted/30">
                            <td className="px-6 py-4 font-medium">
                              {format(parseISO(apt.date), 'MMM d, yyyy', { locale })} <span className="text-muted-foreground font-normal ms-2">{apt.time}</span>
                            </td>
                            <td className="px-6 py-4">{t("common.doctor")} {apt.doctorName}</td>
                            <td className="px-6 py-4">{apt.reason}</td>
                            <td className="px-6 py-4 text-end">
                              <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                                apt.status === 'scheduled' ? 'bg-blue-500/10 text-blue-600' :
                                apt.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600' :
                                'bg-muted text-muted-foreground'
                              }`}>
                                {t(`status.${apt.status}`)}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              <TabsContent value="records" className="m-0 space-y-4">
                {records.length === 0 ? (
                  <div className="bg-card border rounded-xl p-8 text-center text-muted-foreground shadow-sm">
                    {t("patientDetail.noRecords")}
                  </div>
                ) : (
                  records.map(record => (
                    <div key={record.id} className="bg-card border rounded-xl p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-lg">{record.diagnosis}</h4>
                        <span className="text-sm text-muted-foreground">{format(parseISO(record.visitDate), 'MMMM d, yyyy', { locale })}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground block mb-1">{t("patientDetail.symptoms")}</span>
                          <p>{record.symptoms || t("common.unknown")}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground block mb-1">{t("patientDetail.treatment")}</span>
                          <p>{record.treatment || t("common.unknown")}</p>
                        </div>
                        <div className="md:col-span-2 mt-2">
                          <span className="text-muted-foreground block mb-1">{t("patientDetail.attending")}</span>
                          <p>{t("common.doctor")} {record.doctorName}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="prescriptions" className="m-0 space-y-4">
                {prescriptions.length === 0 ? (
                  <div className="bg-card border rounded-xl p-8 text-center text-muted-foreground shadow-sm">
                    {t("patientDetail.noPrescriptions")}
                  </div>
                ) : (
                  prescriptions.map(rx => (
                    <div key={rx.id} className="bg-card border rounded-xl p-6 shadow-sm flex items-start gap-4">
                      <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                        <Pill className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold text-lg">{rx.medication}</h4>
                            <p className="text-sm text-muted-foreground">{t("common.doctor")} {rx.doctorName} • {format(parseISO(rx.createdAt), 'MMM d, yyyy', { locale })}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-4 text-sm bg-muted/50 p-4 rounded-lg">
                          <div>
                            <span className="text-muted-foreground block text-xs">{t("patientDetail.dosage")}</span>
                            <span className="font-medium">{rx.dosage}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-xs">{t("patientDetail.frequency")}</span>
                            <span className="font-medium">{rx.frequency}</span>
                          </div>
                          {rx.durationDays && (
                            <div>
                              <span className="text-muted-foreground block text-xs">{t("patientDetail.duration")}</span>
                              <span className="font-medium">{rx.durationDays}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="invoices" className="m-0">
                <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
                  <table className="w-full text-sm text-start">
                    <thead className="bg-muted/50 text-muted-foreground">
                      <tr>
                        <th className="px-6 py-4 font-medium">{t("patientDetail.invoiceNum")}</th>
                        <th className="px-6 py-4 font-medium">{t("common.date")}</th>
                        <th className="px-6 py-4 font-medium">{t("patientDetail.description")}</th>
                        <th className="px-6 py-4 font-medium">{t("common.amount")}</th>
                        <th className="px-6 py-4 font-medium text-end">{t("common.status")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {invoices.length === 0 ? (
                        <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">{t("patientDetail.noInvoices")}</td></tr>
                      ) : (
                        invoices.map(inv => (
                          <tr key={inv.id} className="hover:bg-muted/30">
                            <td className="px-6 py-4 font-mono text-xs">INV-{inv.id.toString().padStart(5, '0')}</td>
                            <td className="px-6 py-4">{format(parseISO(inv.issuedDate), 'MMM d, yyyy', { locale })}</td>
                            <td className="px-6 py-4">{inv.description}</td>
                            <td className="px-6 py-4 font-medium" dir="ltr">
                              ${inv.amount.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 text-end">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                                inv.status === 'paid' ? 'bg-emerald-500/10 text-emerald-600' :
                                inv.status === 'overdue' ? 'bg-destructive/10 text-destructive' :
                                'bg-amber-500/10 text-amber-600'
                              }`}>
                                {inv.status === 'paid' && <CheckCircle2 className="h-3 w-3" />}
                                {inv.status === 'overdue' && <XCircle className="h-3 w-3" />}
                                {t(`status.${inv.status}`)}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
