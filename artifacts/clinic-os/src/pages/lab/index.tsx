import { useState } from "react";
import { 
  useListLabRequests, 
  useCreateLabRequest, 
  useUpdateLabRequest, 
  useDeleteLabRequest,
  useListPatients,
  useListDoctors
} from "@workspace/api-client-react";
import { 
  FlaskConical, 
  Search, 
  Plus, 
  MoreVertical, 
  Pencil, 
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Activity
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import { useTranslation } from "@/i18n/context";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
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
  FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const labSchema = z.object({
  patientId: z.coerce.number().min(1, "Required"),
  doctorId: z.coerce.number().min(1, "Required"),
  testName: z.string().min(1, "Required"),
  testCode: z.string().optional(),
  category: z.string().min(1, "Required"),
  priority: z.string().min(1, "Required"),
  requestedDate: z.string().min(1, "Required"),
  notes: z.string().optional(),
});

const updateSchema = z.object({
  status: z.string().min(1, "Required"),
  result: z.string().optional(),
  resultDate: z.string().optional(),
  notes: z.string().optional(),
});

export default function LabList() {
  const { t, isRtl } = useTranslation();
  const locale = isRtl ? arLocale : enUS;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: requests, isLoading } = useListLabRequests();
  const { data: patients } = useListPatients();
  const { data: doctors } = useListDoctors();

  const createReq = useCreateLabRequest();
  const updateReq = useUpdateLabRequest();
  const deleteReq = useDeleteLabRequest();

  const createForm = useForm<z.infer<typeof labSchema>>({
    resolver: zodResolver(labSchema),
    defaultValues: {
      requestedDate: format(new Date(), 'yyyy-MM-dd'),
      category: "general",
      priority: "routine"
    }
  });

  const updateForm = useForm<z.infer<typeof updateSchema>>({
    resolver: zodResolver(updateSchema)
  });

  const onCreate = (values: z.infer<typeof labSchema>) => {
    createReq.mutate({ data: values }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/lab-requests"] });
        setCreateOpen(false);
        createForm.reset();
        toast({ title: t("lab.created") });
      }
    });
  };

  const onUpdate = (values: z.infer<typeof updateSchema>) => {
    if (!selectedRequest) return;
    updateReq.mutate({ id: selectedRequest.id, data: values }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/lab-requests"] });
        setUpdateOpen(false);
        toast({ title: t("lab.updated") });
      }
    });
  };

  const onDelete = () => {
    if (!deleteId) return;
    deleteReq.mutate({ id: deleteId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/lab-requests"] });
        setDeleteId(null);
        toast({ title: t("lab.deleted") });
      }
    });
  };

  const openUpdate = (req: any) => {
    setSelectedRequest(req);
    updateForm.reset({
      status: req.status,
      result: req.result || "",
      resultDate: req.resultDate ? format(parseISO(req.resultDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      notes: req.notes || ""
    });
    setUpdateOpen(true);
  };

  const filtered = requests?.filter(r => 
    r.testName.toLowerCase().includes(search.toLowerCase()) || 
    r.patientName?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const total = requests?.length || 0;
  const pending = requests?.filter(r => r.status === 'pending').length || 0;
  const inProgress = requests?.filter(r => r.status === 'in_progress').length || 0;
  const completed = requests?.filter(r => r.status === 'completed').length || 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 end-0 bg-white/10 w-64 h-64 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("lab.title")}</h1>
            <p className="text-indigo-100 mt-1">{t("lab.subtitle")}</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20">
              <div className="text-xs text-indigo-100">{t("lab.total")}</div>
              <div className="text-2xl font-bold">{total}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20">
              <div className="text-xs text-indigo-100">{t("lab.pending")}</div>
              <div className="text-2xl font-bold">{pending}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20">
              <div className="text-xs text-indigo-100">{t("lab.completed")}</div>
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
            className="w-full ps-9 pe-4 py-2 bg-card border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow shadow-sm"
          />
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto rounded-xl hover-elevate shadow-sm"><Plus className="h-4 w-4 me-2"/> {t("lab.newRequest")}</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-0 shadow-2xl rounded-2xl">
            <div className="px-6 py-4 border-b bg-slate-50 dark:bg-slate-900/50">
              <DialogTitle className="text-xl">{t("lab.newRequest")}</DialogTitle>
            </div>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreate)} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={createForm.control} name="patientId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("common.patient")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value?.toString()}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
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
                        <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {doctors?.map(d => <SelectItem key={d.id} value={d.id.toString()}>Dr. {d.firstName} {d.lastName}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={createForm.control} name="testName" render={({ field }) => (
                    <FormItem><FormLabel>{t("lab.testName")}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={createForm.control} name="testCode" render={({ field }) => (
                    <FormItem><FormLabel>{t("lab.testCode")}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={createForm.control} name="category" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("lab.category")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="general">{t("lab.general")}</SelectItem>
                          <SelectItem value="hematology">{t("lab.hematology")}</SelectItem>
                          <SelectItem value="biochemistry">{t("lab.biochemistry")}</SelectItem>
                          <SelectItem value="endocrinology">{t("lab.endocrinology")}</SelectItem>
                          <SelectItem value="microbiology">{t("lab.microbiology")}</SelectItem>
                          <SelectItem value="immunology">{t("lab.immunology")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={createForm.control} name="priority" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("lab.priority")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="routine">{t("lab.routine")}</SelectItem>
                          <SelectItem value="urgent">{t("lab.urgent")}</SelectItem>
                          <SelectItem value="stat">{t("lab.stat")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>

                <FormField control={createForm.control} name="requestedDate" render={({ field }) => (
                  <FormItem><FormLabel>{t("lab.requestedDate")}</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                )} />

                <FormField control={createForm.control} name="notes" render={({ field }) => (
                  <FormItem><FormLabel>{t("lab.notes")}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>{t("common.cancel")}</Button>
                  <Button type="submit" disabled={createReq.isPending}>{t("common.saveChanges")}</Button>
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
                <th className="px-6 py-4">{t("lab.testName")}</th>
                <th className="px-6 py-4">{t("lab.category")} & {t("lab.priority")}</th>
                <th className="px-6 py-4">{t("common.status")}</th>
                <th className="px-6 py-4">{t("lab.requestedDate")}</th>
                <th className="px-6 py-4 text-end">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground animate-pulse">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-muted-foreground flex flex-col items-center"><FlaskConical className="h-8 w-8 mb-2 opacity-20"/>{t("lab.noRequests")}</td></tr>
              ) : filtered.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-foreground">{req.patientName}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{req.doctorName}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-indigo-600 dark:text-indigo-400">{req.testName}</div>
                    {req.testCode && <div className="text-xs text-muted-foreground font-mono mt-0.5">{req.testCode}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">{t(`lab.${req.category}`)}</span>
                      {req.priority === 'urgent' || req.priority === 'stat' ? (
                        <span className="text-[10px] bg-red-100 text-red-700 px-2 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1"><AlertCircle className="h-3 w-3"/> {req.priority}</span>
                      ) : (
                        <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-1 rounded-full font-bold uppercase tracking-wider">{req.priority}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium border flex items-center gap-1.5 w-max
                      ${req.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        req.status === 'in_progress' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        req.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        'bg-slate-50 text-slate-700 border-slate-200'}`}>
                      {req.status === 'pending' ? <Clock className="h-3 w-3"/> : req.status === 'completed' ? <CheckCircle2 className="h-3 w-3"/> : <Activity className="h-3 w-3"/>}
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
                          <FileText className="me-2 h-4 w-4 text-indigo-500" /> {t("lab.editRequest")}
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
          <div className="px-6 py-4 border-b bg-indigo-50 dark:bg-indigo-900/20">
            <DialogTitle className="text-xl text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-indigo-500" /> {t("lab.editRequest")}
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
              
              <FormField control={updateForm.control} name="result" render={({ field }) => (
                <FormItem><FormLabel>{t("lab.result")}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )} />
              
              <FormField control={updateForm.control} name="resultDate" render={({ field }) => (
                <FormItem><FormLabel>{t("lab.resultDate")}</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
              )} />
              
              <FormField control={updateForm.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>{t("lab.notes")}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )} />

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setUpdateOpen(false)}>{t("common.cancel")}</Button>
                <Button type="submit" disabled={updateReq.isPending}>{t("common.saveChanges")}</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl border-0 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("lab.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("lab.deleteDesc")}</AlertDialogDescription>
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
