import { useState } from "react";
import { 
  useListMedicalRecords, 
  useCreateMedicalRecord, 
  useUpdateMedicalRecord, 
  useDeleteMedicalRecord,
  getListMedicalRecordsQueryKey,
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
  FileText
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
  DropdownMenuTrigger,
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

const recordSchema = z.object({
  patientId: z.coerce.number().min(1, "Patient is required"),
  doctorId: z.coerce.number().min(1, "Doctor is required"),
  visitDate: z.string().min(1, "Date is required"),
  diagnosis: z.string().min(1, "Diagnosis is required"),
  symptoms: z.string().optional(),
  treatment: z.string().optional(),
  vitals: z.string().optional(),
  notes: z.string().optional(),
});

type RecordFormValues = z.infer<typeof recordSchema>;

export default function RecordsList() {
  const { t, isRtl } = useTranslation();
  const locale = isRtl ? arLocale : enUS;

  const [patientFilter, setPatientFilter] = useState<string>("all");
  const { data: records, isLoading } = useListMedicalRecords(
    patientFilter !== "all" ? { patientId: Number(patientFilter) } : undefined
  );
  const { data: patients } = useListPatients();
  const { data: doctors } = useListDoctors();
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const createRecord = useCreateMedicalRecord();
  const updateRecord = useUpdateMedicalRecord();
  const deleteRecord = useDeleteMedicalRecord();

  const form = useForm<RecordFormValues>({
    resolver: zodResolver(recordSchema),
    defaultValues: {
      patientId: 0,
      doctorId: 0,
      visitDate: new Date().toISOString().split('T')[0],
      diagnosis: "",
      symptoms: "",
      treatment: "",
      vitals: "",
      notes: "",
    }
  });

  const onSubmit = (data: RecordFormValues) => {
    if (editingId) {
      updateRecord.mutate(
        { id: editingId, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListMedicalRecordsQueryKey() });
            setIsCreateOpen(false);
            setEditingId(null);
            form.reset();
            toast({ title: t("records.updated") });
          }
        }
      );
    } else {
      createRecord.mutate(
        { data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListMedicalRecordsQueryKey() });
            setIsCreateOpen(false);
            form.reset();
            toast({ title: t("records.created") });
          }
        }
      );
    }
  };

  const handleEdit = (record: any) => {
    form.reset({
      patientId: record.patientId,
      doctorId: record.doctorId,
      visitDate: record.visitDate,
      diagnosis: record.diagnosis,
      symptoms: record.symptoms || "",
      treatment: record.treatment || "",
      vitals: record.vitals || "",
      notes: record.notes || "",
    });
    setEditingId(record.id);
    setIsCreateOpen(true);
  };

  const handleDelete = () => {
    if (!deletingId) return;
    deleteRecord.mutate(
      { id: deletingId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMedicalRecordsQueryKey() });
          setDeletingId(null);
          toast({ title: t("records.deleted") });
        }
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("records.title")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("records.subtitle")}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={patientFilter} onValueChange={setPatientFilter}>
            <SelectTrigger className="w-[200px] bg-card">
              <SelectValue placeholder={t("common.allPatients")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.allPatients")}</SelectItem>
              {patients?.map(p => (
                <SelectItem key={p.id} value={String(p.id)}>{p.firstName} {p.lastName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
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
                {t("records.newRecord")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? t("records.editRecord") : t("records.addRecord")}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
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
                                  {t("common.doctor")} {d.firstName} {d.lastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="visitDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("records.visitDate")}</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="vitals"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("records.vitals")}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="diagnosis"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("records.primaryDiagnosis")}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="symptoms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("records.presentingSymptoms")}</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="treatment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("records.treatmentPlan")}</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
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
                        <FormLabel>{t("patients.notes")}</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
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
                      disabled={createRecord.isPending || updateRecord.isPending}
                    >
                      {t("common.cancel")}
                    </Button>
                    <Button 
                      type="submit"
                      disabled={createRecord.isPending || updateRecord.isPending}
                    >
                      {(createRecord.isPending || updateRecord.isPending) && (
                        <Loader2 className="me-2 h-4 w-4 animate-spin" />
                      )}
                      {editingId ? t("common.saveChanges") : t("records.saveRecord")}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {isLoading ? (
          <div className="col-span-full flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : records?.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-card border rounded-xl">
            <p className="text-muted-foreground">{t("records.noRecords")}</p>
          </div>
        ) : (
          records?.map((record) => (
            <div key={record.id} className="bg-card border rounded-xl overflow-hidden shadow-sm hover-elevate transition-shadow group flex flex-col h-full">
              <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg text-foreground">{record.diagnosis}</h3>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                      <span className="font-medium text-foreground">{record.patientName}</span>
                      <span>•</span>
                      <span>{format(parseISO(record.visitDate), 'MMM d, yyyy', { locale })}</span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 -me-2">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(record)}>
                        <Pencil className="me-2 h-4 w-4" /> {t("records.editRecord")}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive focus:text-destructive focus:bg-destructive/10"
                        onClick={() => setDeletingId(record.id)}
                      >
                        <Trash2 className="me-2 h-4 w-4" /> {t("common.delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <div className="space-y-4 mt-6">
                  {record.symptoms && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{t("patientDetail.symptoms")}</h4>
                      <p className="text-sm text-foreground">{record.symptoms}</p>
                    </div>
                  )}
                  {record.treatment && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{t("patientDetail.treatment")}</h4>
                      <p className="text-sm text-foreground">{record.treatment}</p>
                    </div>
                  )}
                  {record.vitals && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{t("patientDetail.vitals")}</h4>
                      <p className="text-sm font-mono bg-muted/50 p-2 rounded-md inline-block">{record.vitals}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="px-6 py-3 bg-muted/30 border-t flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{t("patientDetail.attending")}: <span className="font-medium text-foreground">{t("common.doctor")} {record.doctorName}</span></span>
                <span className="text-xs text-muted-foreground font-mono">REC-{record.id}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("records.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("records.deleteDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteRecord.isPending}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteRecord.isPending}
            >
              {deleteRecord.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
