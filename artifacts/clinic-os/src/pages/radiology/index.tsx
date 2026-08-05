import { useAuth } from "@/contexts/auth-context";
import { useState } from "react";
import { 
  useListRadiologyRequests, 
  useCreateRadiologyRequest, 
  useUpdateRadiologyRequest, 
  useDeleteRadiologyRequest,
  useListPatients,
  useListDoctors
} from "@workspace/api-client-react";
import { 
  Activity as RadiologyIcon, 
  Search, 
  Plus, 
  MoreVertical, 
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import { useTranslation } from "@/i18n/context";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
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
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const createSchema = z.object({
  patientId: z.coerce.number().min(1, "Required"),
  doctorId: z.coerce.number().min(1, "Required"),
  studyType: z.string().min(1, "Required"),
  bodyPart: z.string().min(1, "Required"),
  priority: z.string().optional(),
  requestedDate: z.string().min(1, "Required"),
  notes: z.string().optional(),
});

const updateSchema = z.object({
  status: z.string().min(1, "Required"),
  findings: z.string().optional(),
  impression: z.string().optional(),
  reportDate: z.string().optional(),
  notes: z.string().optional(),
});

export default function RadiologyList() {
  const { t, isRtl } = useTranslation();
  const locale = isRtl ? arLocale : enUS;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: requests, isLoading } = useListRadiologyRequests(useAuth().role === 'doctor' ? { doctorId: useAuth().doctorId } : undefined);
  const { data: patients } = useListPatients();
  const { data: doctors } = useListDoctors();

  const createReq = useCreateRadiologyRequest();
  const updateReq = useUpdateRadiologyRequest();
  const deleteReq = useDeleteRadiologyRequest();

  const createForm = useForm<z.infer<typeof createSchema>>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      requestedDate: format(new Date(), 'yyyy-MM-dd'),
      priority: "routine"
    }
  });

  const updateForm = useForm<z.infer<typeof updateSchema>>({
    resolver: zodResolver(updateSchema)
  });

  const onCreate = (values: z.infer<typeof createSchema>) => {
    createReq.mutate({ data: values }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/radiology-requests"] });
        setCreateOpen(false);
        createForm.reset();
        toast({ title: t("radiology.created") });
      }
    });
  };

  const onUpdate = (values: z.infer<typeof updateSchema>) => {
    if (!selectedReq) return;
    updateReq.mutate({ id: selectedReq.id, data: values }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/radiology-requests"] });
        setUpdateOpen(false);
        toast({ title: t("radiology.updated") });
      }
    });
  };

  const onDelete = () => {
    if (!deleteId) return;
    deleteReq.mutate({ id: deleteId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/radiology-requests"] });
        setDeleteId(null);
        toast({ title: t("radiology.deleted") });
      }
    });
  };

  const openUpdate = (req: any) => {
    setSelectedReq(req);
    updateForm.reset({
      status: req.status,
      findings: req.findings || "",
      impression: req.impression || "",
      reportDate: req.reportDate ? format(parseISO(req.reportDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      notes: req.notes || ""
    });
    setUpdateOpen(true);
  };

  const filtered = requests?.filter(r => 
    r.studyType.toLowerCase().includes(search.toLowerCase()) || 
    r.patientName?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const total = requests?.length || 0;
  const pending = requests?.filter(r => r.status === 'pending').length || 0;
  const completed = requests?.filter(r => r.status === 'completed').length || 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 end-0 bg-white/10 w-64 h-64 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("radiology.title")}</h1>
            <p className="text-violet-100 mt-1">{t("radiology.subtitle")}</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20">
              <div className="text-xs text-violet-100">{t("lab.total")}</div>
              <div className="text-2xl font-bold">{total}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20">
              <div className="text-xs text-violet-100">{t("lab.pending")}</div>
              <div className="text-2xl font-bold">{pending}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20">
              <div className="text-xs text-violet-100">{t("lab.completed")}</div>
              <div className="text-2xl font-bold">{completed}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder={t("common.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full ps-9 pe-4 py-2 bg-card border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-shadow shadow-sm"
          />
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto rounded-xl bg-violet-600 hover:bg-violet-700 shadow-sm"><Plus className="h-4 w-4 me-2"/> {t("radiology.newRequest")}</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-0 shadow-2xl rounded-2xl">
            <div className="px-6 py-4 border-b bg-slate-50 dark:bg-slate-900/50">
              <DialogTitle className="text-xl">{t("radiology.newRequest")}</DialogTitle>
            </div>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreate)} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={createForm.control} name="patientId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("common.patient")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value?.toString()}>
                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                        <SelectContent>
                          {patients?.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.firstName} {p.lastName}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={createForm.control} name="doctorId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("common.doctor")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value?.toString()}>
                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                        <SelectContent>
                          {doctors?.map(d => <SelectItem key={d.id} value={d.id.toString()}>Dr. {d.firstName} {d.lastName}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={createForm.control} name="studyType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("radiology.studyType")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="X-Ray">X-Ray</SelectItem>
                          <SelectItem value="CT Scan">CT Scan</SelectItem>
                          <SelectItem value="MRI">MRI</SelectItem>
                          <SelectItem value="Ultrasound">Ultrasound</SelectItem>
                          <SelectItem value="PET Scan">PET Scan</SelectItem>
                          <SelectItem value="Mammography">Mammography</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={createForm.control} name="bodyPart" render={({ field }) => (
                    <FormItem><FormLabel>{t("radiology.bodyPart")}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={createForm.control} name="priority" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("lab.priority")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="routine">{t("lab.routine")}</SelectItem>
                          <SelectItem value="urgent">{t("lab.urgent")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={createForm.control} name="requestedDate" render={({ field }) => (
                    <FormItem><FormLabel>{t("lab.requestedDate")}</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                  )} />
                </div>

                <FormField control={createForm.control} name="notes" render={({ field }) => (
                  <FormItem><FormLabel>{t("lab.notes")}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>{t("common.cancel")}</Button>
                  <Button type="submit" className="bg-violet-600 hover:bg-violet-700" disabled={createReq.isPending}>{t("common.saveChanges")}</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-muted-foreground font-medium border-b">
              <tr>
                <th className="px-6 py-4">{t("common.patient")} / {t("common.doctor")}</th>
                <th className="px-6 py-4">{t("radiology.studyType")} & {t("radiology.bodyPart")}</th>
                <th className="px-6 py-4">{t("common.status")}</th>
                <th className="px-6 py-4">{t("lab.requestedDate")}</th>
                <th className="px-6 py-4 text-end">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground animate-pulse">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground flex flex-col items-center"><RadiologyIcon className="h-8 w-8 mb-2 opacity-20"/>{t("radiology.noRequests")}</td></tr>
              ) : filtered.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-foreground">{req.patientName}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{req.doctorName}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-violet-600 dark:text-violet-400">{req.studyType}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{req.bodyPart}</div>
                    {req.priority === 'urgent' && <span className="mt-1 inline-flex text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">{req.priority}</span>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium border flex items-center gap-1.5 w-max
                      ${req.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        req.status === 'in_progress' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        req.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        'bg-slate-50 text-slate-700 border-slate-200'}`}>
                      {req.status === 'pending' ? <Clock className="h-3 w-3"/> : req.status === 'completed' ? <CheckCircle2 className="h-3 w-3"/> : <AlertCircle className="h-3 w-3"/>}
                      {t(`lab.${req.status}`)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-muted-foreground whitespace-nowrap" dir="ltr">
                    {format(parseISO(req.requestedDate), 'MMM d, yyyy', { locale })}
                  </td>
                  <td className="px-6 py-4 text-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0 rounded-lg hover:bg-slate-100"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl">
                        <DropdownMenuItem onClick={() => openUpdate(req)} className="rounded-lg cursor-pointer">
                          <FileText className="me-2 h-4 w-4 text-violet-500" /> {t("radiology.editRequest")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDeleteId(req.id)} className="rounded-lg text-destructive focus:bg-destructive/10 cursor-pointer">
                          <Trash2 className="me-2 h-4 w-4" /> {t("common.delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={updateOpen} onOpenChange={setUpdateOpen}>
        <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden border-0 shadow-2xl rounded-2xl">
          <div className="px-6 py-4 border-b bg-violet-50 dark:bg-violet-900/20">
            <DialogTitle className="text-xl text-violet-900 dark:text-violet-100 flex items-center gap-2">
              <RadiologyIcon className="h-5 w-5 text-violet-500" /> {t("radiology.editRequest")}
            </DialogTitle>
          </div>
          <Form {...updateForm}>
            <form onSubmit={updateForm.handleSubmit(onUpdate)} className="p-6 space-y-4">
              <FormField control={updateForm.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("common.status")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="pending">{t("lab.pending")}</SelectItem>
                      <SelectItem value="in_progress">{t("lab.in_progress")}</SelectItem>
                      <SelectItem value="completed">{t("lab.completed")}</SelectItem>
                      <SelectItem value="cancelled">{t("lab.cancelled")}</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              
              <FormField control={updateForm.control} name="findings" render={({ field }) => (
                <FormItem><FormLabel>{t("radiology.findings")}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )} />
              
              <FormField control={updateForm.control} name="impression" render={({ field }) => (
                <FormItem><FormLabel>{t("radiology.impression")}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )} />

              <FormField control={updateForm.control} name="reportDate" render={({ field }) => (
                <FormItem><FormLabel>{t("radiology.reportDate")}</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
              )} />

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setUpdateOpen(false)}>{t("common.cancel")}</Button>
                <Button type="submit" className="bg-violet-600 hover:bg-violet-700" disabled={updateReq.isPending}>{t("common.saveChanges")}</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl border-0 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("radiology.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("radiology.deleteDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
