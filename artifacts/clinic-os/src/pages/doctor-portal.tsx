import { useState, useEffect } from "react";
import { 
  useListDoctors, 
  useListAppointments,
  useListMedicalRecords,
  useListPrescriptions,
  useUpdateAppointment,
  getListAppointmentsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/i18n/context";
import { format, parseISO, isAfter, startOfDay } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import {
  Calendar, Users, Pill, FileText, CheckCircle2, Clock, Ban
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export default function DoctorPortal() {
  const { t, isRtl } = useTranslation();
  const locale = isRtl ? arLocale : enUS;
  const queryClient = useQueryClient();

  const [doctorId, setDoctorId] = useState<number | null>(
    Number(localStorage.getItem('clinic-os-doctor-id')) || null
  );

  const { data: doctors } = useListDoctors();
  const { data: appointments } = useListAppointments(doctorId ? { doctorId } : undefined);
  const { data: records } = useListMedicalRecords(doctorId ? { doctorId } : undefined);
  const { data: prescriptions } = useListPrescriptions(doctorId ? { doctorId } : undefined);
  
  const updateAppointment = useUpdateAppointment();

  useEffect(() => {
    if (doctorId) {
      localStorage.setItem('clinic-os-doctor-id', String(doctorId));
    }
  }, [doctorId]);

  if (!doctorId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <h2 className="text-2xl font-bold">{t("doctorPortal.selectDoctor")}</h2>
        <Select onValueChange={(v) => setDoctorId(Number(v))}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder={t("doctorPortal.selectDoctor")} />
          </SelectTrigger>
          <SelectContent>
            {doctors?.map(d => (
              <SelectItem key={d.id} value={String(d.id)}>
                {t("common.doctor")} {d.firstName} {d.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayAppointments = appointments?.filter(a => a.date === todayStr) || [];
  
  const upcomingAppointments = appointments?.filter(a => {
    const aptDate = parseISO(a.date);
    return isAfter(aptDate, startOfDay(new Date())) || a.date === todayStr;
  }).filter(a => a.status !== 'cancelled' && a.status !== 'completed') || [];

  const uniquePatients = new Set(appointments?.map(a => a.patientId)).size;
  const rxCount = prescriptions?.length || 0;

  const handleStatusChange = (id: number, status: string) => {
    updateAppointment.mutate(
      { id, data: { status } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey(), exact: false });
        }
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("doctorPortal.title")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("doctorPortal.subtitle")}</p>
        </div>
        <Select value={String(doctorId)} onValueChange={(v) => setDoctorId(Number(v))}>
          <SelectTrigger className="w-[250px] bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {doctors?.map(d => (
              <SelectItem key={d.id} value={String(d.id)}>
                {t("common.doctor")} {d.firstName} {d.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-blue-500" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-sm font-medium text-muted-foreground">{t("doctorPortal.todayAppointments")}</h3>
            <p className="text-3xl font-bold text-foreground mt-1">{todayAppointments.length}</p>
          </div>
        </div>
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-purple-500" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-sm font-medium text-muted-foreground">{t("doctorPortal.upcomingAppointments")}</h3>
            <p className="text-3xl font-bold text-foreground mt-1">{upcomingAppointments.length}</p>
          </div>
        </div>
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-emerald-500" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-sm font-medium text-muted-foreground">{t("doctorPortal.totalPatientsSeen")}</h3>
            <p className="text-3xl font-bold text-foreground mt-1">{uniquePatients}</p>
          </div>
        </div>
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Pill className="h-5 w-5 text-amber-500" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-sm font-medium text-muted-foreground">{t("doctorPortal.prescriptionsIssued")}</h3>
            <p className="text-3xl font-bold text-foreground mt-1">{rxCount}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border rounded-xl shadow-sm flex flex-col">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">{t("doctorPortal.todayAppointments")}</h3>
          </div>
          <div className="p-0 overflow-y-auto max-h-[500px]">
            {todayAppointments.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">{t("doctorPortal.noAppointmentsToday")}</div>
            ) : (
              <div className="divide-y divide-border">
                {todayAppointments.map(apt => (
                  <div key={apt.id} className="p-6 flex items-start justify-between hover:bg-muted/30 transition-colors">
                    <div>
                      <div className="font-medium text-foreground">{apt.patientName}</div>
                      <div className="text-sm text-muted-foreground mt-1">{apt.time} - {apt.reason}</div>
                      <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground">
                        {t(`status.${apt.status}`)}
                      </div>
                    </div>
                    {apt.status === 'scheduled' || apt.status === 'confirmed' ? (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="h-8 border-emerald-500 text-emerald-600 hover:bg-emerald-500/10" onClick={() => handleStatusChange(apt.id, 'completed')}>
                          <CheckCircle2 className="h-4 w-4 me-1" /> {t("doctorPortal.complete")}
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 border-destructive text-destructive hover:bg-destructive/10" onClick={() => handleStatusChange(apt.id, 'no_show')}>
                          <Ban className="h-4 w-4 me-1" /> {t("doctorPortal.noShow")}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card border rounded-xl shadow-sm flex flex-col">
             <div className="p-6 border-b">
              <h3 className="text-lg font-semibold">{t("doctorPortal.recentRecords")}</h3>
            </div>
            <div className="p-0 overflow-y-auto max-h-[250px]">
               {records?.length === 0 ? (
                 <div className="p-6 text-center text-muted-foreground">{t("patientDetail.noRecords")}</div>
               ) : (
                 <div className="divide-y divide-border">
                   {records?.slice(0, 5).map(record => (
                     <div key={record.id} className="p-6 hover:bg-muted/30 transition-colors">
                       <div className="flex justify-between">
                         <h4 className="font-medium text-foreground">{record.diagnosis}</h4>
                         <span className="text-sm text-muted-foreground">{format(parseISO(record.visitDate), 'MMM d', { locale })}</span>
                       </div>
                       <p className="text-sm text-muted-foreground mt-1">{record.patientName}</p>
                     </div>
                   ))}
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
