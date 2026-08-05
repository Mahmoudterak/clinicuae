import { useState } from "react";
import { 
  useListAppointments, 
  useCreateAppointment, 
  useUpdateAppointment, 
  useDeleteAppointment,
  getListAppointmentsQueryKey,
  useListPatients,
  useListDoctors
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Plus, 
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  XCircle,
  Ban
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, parseISO } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import { useTranslation } from "@/i18n/context";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const appointmentSchema = z.object({
  patientId: z.coerce.number().min(1, "Patient is required"),
  doctorId: z.coerce.number().min(1, "Doctor is required"),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  durationMinutes: z.coerce.number().optional(),
  status: z.string().default("scheduled"),
  reason: z.string().min(1, "Reason is required"),
  notes: z.string().optional(),
});

type AppointmentFormValues = z.infer<typeof appointmentSchema>;

const getStatusConfig = () => ({
  scheduled: { color: "bg-blue-500/10 text-blue-600", icon: Clock },
  confirmed: { color: "bg-purple-500/10 text-purple-600", icon: CheckCircle2 },
  completed: { color: "bg-emerald-500/10 text-emerald-600", icon: CheckCircle2 },
  cancelled: { color: "bg-destructive/10 text-destructive", icon: XCircle },
  no_show: { color: "bg-amber-500/10 text-amber-600", icon: Ban },
});

export default function AppointmentsList() {
  const { t, isRtl } = useTranslation();
  const locale = isRtl ? arLocale : enUS;

  const [dateFilter, setDateFilter] = useState("");
  const { data: appointments, isLoading } = useListAppointments(dateFilter ? { date: dateFilter } : undefined);
  const { data: patients } = useListPatients();
  const { data: doctors } = useListDoctors();
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const createAppointment = useCreateAppointment();
  const updateAppointment = useUpdateAppointment();
  const deleteAppointment = useDeleteAppointment();

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patientId: 0,
      doctorId: 0,
      date: "",
      time: "",
      durationMinutes: 30,
      status: "scheduled",
      reason: "",
      notes: "",
    }
  });

  const onSubmit = (data: AppointmentFormValues) => {
    if (editingId) {
      updateAppointment.mutate(
        { id: editingId, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });
            setIsCreateOpen(false);
            setEditingId(null);
            form.reset();
            toast({ title: t("appointments.updated") });
          }
        }
      );
    } else {
      createAppointment.mutate(
        { data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });
            setIsCreateOpen(false);
            form.reset();
            toast({ title: t("appointments.created") });
          }
        }
      );
    }
  };

  const handleEdit = (appointment: any) => {
    form.reset({
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      date: appointment.date,
      time: appointment.time,
      durationMinutes: appointment.durationMinutes || 30,
      status: appointment.status,
      reason: appointment.reason,
      notes: appointment.notes || "",
    });
    setEditingId(appointment.id);
    setIsCreateOpen(true);
  };

  const handleStatusChange = (id: number, status: string) => {
    updateAppointment.mutate(
      { id, data: { status } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });
          toast({ title: t("appointments.statusUpdated", { status: t(`status.${status}`) }) });
        }
      }
    );
  };

  const handleDelete = () => {
    if (!deletingId) return;
    deleteAppointment.mutate(
      { id: deletingId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });
          setDeletingId(null);
          toast({ title: t("appointments.deleted") });
        }
      }
    );
  };

  const statusConfig = getStatusConfig();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("appointments.title")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("appointments.subtitle")}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <CalendarIcon className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              type="date"
              className="w-full sm:w-[180px] ps-9 bg-card"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
          {dateFilter && (
            <Button variant="ghost" size="sm" onClick={() => setDateFilter("")} className="px-2">{t("common.clear")}</Button>
          )}
          
          <Dialog open={isCreateOpen} onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (!open) {
              setEditingId(null);
              form.reset();
            }
          }}>
            <DialogTrigger asChild>
              <Button className="shrink-0 gap-1.5">
                <Plus className="h-4 w-4" />
                {t("appointments.newAppointment")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? t("appointments.editAppointment") : t("appointments.schedule")}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                  <FormField
                    control={form.control}
                    name="patientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("common.patient")}</FormLabel>
                        <Select 
                          onValueChange={(v) => field.onChange(Number(v))} 
                          value={field.value ? String(field.value) : undefined}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {patients?.map(p => (
                              <SelectItem key={p.id} value={String(p.id)}>
                                {p.firstName} {p.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="doctorId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("common.doctor")}</FormLabel>
                        <Select 
                          onValueChange={(v) => field.onChange(Number(v))} 
                          value={field.value ? String(field.value) : undefined}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {doctors?.map(d => (
                              <SelectItem key={d.id} value={String(d.id)}>
                                {t("common.doctor")} {d.firstName} {d.lastName} ({d.specialty})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("common.date")}</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("common.time")}</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="durationMinutes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("appointments.duration")}</FormLabel>
                          <Select 
                            onValueChange={(v) => field.onChange(Number(v))} 
                            value={String(field.value)}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="15">15</SelectItem>
                              <SelectItem value="30">30</SelectItem>
                              <SelectItem value="45">45</SelectItem>
                              <SelectItem value="60">60</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("common.status")}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.keys(statusConfig).map(k => (
                                <SelectItem key={k} value={k}>{t(`status.${k}`)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("appointments.reason")}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("appointments.addNotes")}</FormLabel>
                        <FormControl>
                          <Textarea 
                            className="resize-none"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter className="pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsCreateOpen(false)}
                      disabled={createAppointment.isPending || updateAppointment.isPending}
                    >
                      {t("common.cancel")}
                    </Button>
                    <Button 
                      type="submit"
                      disabled={createAppointment.isPending || updateAppointment.isPending}
                    >
                      {(createAppointment.isPending || updateAppointment.isPending) && (
                        <Loader2 className="me-2 h-4 w-4 animate-spin" />
                      )}
                      {editingId ? t("common.saveChanges") : t("appointments.scheduleBtn")}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-start">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-6 py-4 font-medium">{t("common.date")} & {t("common.time")}</th>
                <th className="px-6 py-4 font-medium">{t("common.patient")}</th>
                <th className="px-6 py-4 font-medium">{t("common.doctor")}</th>
                <th className="px-6 py-4 font-medium">{t("common.reason")}</th>
                <th className="px-6 py-4 font-medium">{t("common.status")}</th>
                <th className="px-6 py-4 font-medium text-end">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : appointments?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    {t("appointments.noAppointments")}
                  </td>
                </tr>
              ) : (
                appointments?.map((apt) => {
                  const status = statusConfig[apt.status as keyof typeof statusConfig] || statusConfig.scheduled;
                  const StatusIcon = status.icon;
                  
                  return (
                    <tr key={apt.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-foreground">{format(parseISO(apt.date), 'MMM d, yyyy', { locale })}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{apt.time} ({apt.durationMinutes}m)</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">{apt.patientName}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-foreground">{t("common.doctor")} {apt.doctorName}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="truncate block max-w-[200px]">{apt.reason}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {t(`status.${apt.status}`)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>{t("appointments.changeStatus")}</DropdownMenuLabel>
                            {Object.keys(statusConfig).map(key => {
                              if (key === apt.status) return null;
                              return (
                                <DropdownMenuItem 
                                  key={key}
                                  onClick={() => handleStatusChange(apt.id, key)}
                                >
                                  {t("appointments.markAs", { status: t(`status.${key}`) })}
                                </DropdownMenuItem>
                              );
                            })}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleEdit(apt)}>
                              <Pencil className="me-2 h-4 w-4" /> {t("appointments.editAppointment")}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive focus:bg-destructive/10"
                              onClick={() => setDeletingId(apt.id)}
                            >
                              <Trash2 className="me-2 h-4 w-4" /> {t("common.delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("appointments.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("appointments.deleteDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteAppointment.isPending}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteAppointment.isPending}
            >
              {deleteAppointment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
