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

const statusConfig = {
  scheduled: { label: "Scheduled", color: "bg-blue-500/10 text-blue-600", icon: Clock },
  confirmed: { label: "Confirmed", color: "bg-purple-500/10 text-purple-600", icon: CheckCircle2 },
  completed: { label: "Completed", color: "bg-emerald-500/10 text-emerald-600", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "bg-destructive/10 text-destructive", icon: XCircle },
  no_show: { label: "No Show", color: "bg-amber-500/10 text-amber-600", icon: Ban },
};

export default function AppointmentsList() {
  const [dateFilter, setDateFilter] = useState("");
  const { data: appointments, isLoading } = useListAppointments({ date: dateFilter || undefined });
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
            toast({ title: "Appointment updated successfully" });
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
            toast({ title: "Appointment scheduled successfully" });
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
          toast({ title: `Appointment marked as ${status}` });
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
          toast({ title: "Appointment deleted" });
        }
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
          <p className="text-muted-foreground mt-1 text-sm">Schedule and manage patient visits.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              type="date"
              className="w-full sm:w-[180px] pl-9 bg-card"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
          {dateFilter && (
            <Button variant="ghost" size="sm" onClick={() => setDateFilter("")} className="px-2">Clear</Button>
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
                New Appointment
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Appointment" : "Schedule Appointment"}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                  <FormField
                    control={form.control}
                    name="patientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Patient</FormLabel>
                        <Select 
                          onValueChange={(v) => field.onChange(Number(v))} 
                          value={field.value ? String(field.value) : undefined}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select patient" />
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
                        <FormLabel>Doctor</FormLabel>
                        <Select 
                          onValueChange={(v) => field.onChange(Number(v))} 
                          value={field.value ? String(field.value) : undefined}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select doctor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {doctors?.map(d => (
                              <SelectItem key={d.id} value={String(d.id)}>
                                Dr. {d.firstName} {d.lastName} ({d.specialty})
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
                          <FormLabel>Date</FormLabel>
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
                          <FormLabel>Time</FormLabel>
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
                          <FormLabel>Duration (mins)</FormLabel>
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
                              <SelectItem value="15">15 minutes</SelectItem>
                              <SelectItem value="30">30 minutes</SelectItem>
                              <SelectItem value="45">45 minutes</SelectItem>
                              <SelectItem value="60">1 hour</SelectItem>
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
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="scheduled">Scheduled</SelectItem>
                              <SelectItem value="confirmed">Confirmed</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                              <SelectItem value="no_show">No Show</SelectItem>
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
                        <FormLabel>Reason for Visit</FormLabel>
                        <FormControl>
                          <Input placeholder="General checkup..." {...field} />
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
                        <FormLabel>Additional Notes</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Optional notes..." 
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
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      disabled={createAppointment.isPending || updateAppointment.isPending}
                    >
                      {(createAppointment.isPending || updateAppointment.isPending) && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {editingId ? "Save Changes" : "Schedule"}
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
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-6 py-4 font-medium">Date & Time</th>
                <th className="px-6 py-4 font-medium">Patient</th>
                <th className="px-6 py-4 font-medium">Doctor</th>
                <th className="px-6 py-4 font-medium">Reason</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
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
                    No appointments found for the selected date.
                  </td>
                </tr>
              ) : (
                appointments?.map((apt) => {
                  const status = statusConfig[apt.status as keyof typeof statusConfig] || statusConfig.scheduled;
                  const StatusIcon = status.icon;
                  
                  return (
                    <tr key={apt.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-foreground">{format(parseISO(apt.date), 'MMM d, yyyy')}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{apt.time} ({apt.durationMinutes}m)</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">{apt.patientName}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-foreground">Dr. {apt.doctorName}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="truncate block max-w-[200px]">{apt.reason}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                            {Object.entries(statusConfig).map(([key, config]) => {
                              if (key === apt.status) return null;
                              return (
                                <DropdownMenuItem 
                                  key={key}
                                  onClick={() => handleStatusChange(apt.id, key)}
                                >
                                  Mark as {config.label}
                                </DropdownMenuItem>
                              );
                            })}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleEdit(apt)}>
                              <Pencil className="mr-2 h-4 w-4" /> Edit Appointment
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive focus:bg-destructive/10"
                              onClick={() => setDeletingId(apt.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
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
            <AlertDialogTitle>Delete Appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the appointment
              record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteAppointment.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteAppointment.isPending}
            >
              {deleteAppointment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
