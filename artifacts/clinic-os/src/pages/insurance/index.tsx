import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { 
  useListInsurance, 
  useCreateInsuranceRecord, 
  useUpdateInsuranceRecord, 
  useDeleteInsuranceRecord,
  useListPatients,
  useListAppointments
} from "@workspace/api-client-react";
import { 
  ShieldCheck, 
  Search, 
  Plus, 
  MoreVertical, 
  Trash2,
  Pencil,
  AlertCircle
} from "lucide-react";
import { useTranslation } from "@/i18n/context";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format, parseISO, addDays, isBefore, isAfter } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const insuranceSchema = z.object({
  patientId: z.coerce.number().min(1, "Required"),
  provider: z.string().min(1, "Required"),
  policyNumber: z.string().min(1, "Required"),
  groupNumber: z.string().optional(),
  planName: z.string().optional(),
  holderName: z.string().optional(),
  relationship: z.string().min(1, "Required"),
  coverageType: z.string().min(1, "Required"),
  coveragePercent: z.coerce.number().min(0).max(100).optional(),
  deductible: z.coerce.number().min(0).optional(),
  expiryDate: z.string().optional(),
  status: z.string().optional()
});

export default function InsuranceList() {
  const { t, isRtl } = useTranslation();
  const locale = isRtl ? arLocale : enUS;
  const numLocale = isRtl ? 'ar-AE' : 'en-US';
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { role, doctorId } = useAuth();

  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: allInsurance, isLoading } = useListInsurance();
  const { data: patients } = useListPatients();
  const { data: appts } = useListAppointments(role === 'doctor' ? { doctorId } : undefined);

  const createIns = useCreateInsuranceRecord();
  const updateIns = useUpdateInsuranceRecord();
  const deleteIns = useDeleteInsuranceRecord();

  const doctorPatientIds = role === 'doctor' && appts 
    ? new Set(appts.map(a => a.patientId)) 
    : null;

  const insuranceRecords = role === 'doctor' && doctorPatientIds && allInsurance
    ? allInsurance.filter(i => doctorPatientIds.has(i.patientId))
    : allInsurance;

  const form = useForm<z.infer<typeof insuranceSchema>>({
    resolver: zodResolver(insuranceSchema),
    defaultValues: {
      relationship: "self",
      coverageType: "comprehensive",
      coveragePercent: 80,
      status: "active"
    }
  });

  const onSubmit = (values: z.infer<typeof insuranceSchema>) => {
    if (editingId) {
      updateIns.mutate({ id: editingId.id, data: values }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/insurance"] });
          setCreateOpen(false);
          setEditingId(null);
          toast({ title: t("insurance.updated") });
        }
      });
    } else {
      createIns.mutate({ data: values }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/insurance"] });
          setCreateOpen(false);
          form.reset();
          toast({ title: t("insurance.created") });
        }
      });
    }
  };

  const onDelete = () => {
    if (!deleteId) return;
    deleteIns.mutate({ id: deleteId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/insurance"] });
        setDeleteId(null);
        toast({ title: t("insurance.deleted") });
      }
    });
  };

  const openEdit = (record: any) => {
    setEditingId(record);
    form.reset({
      patientId: record.patientId,
      provider: record.provider,
      policyNumber: record.policyNumber,
      groupNumber: record.groupNumber || "",
      planName: record.planName || "",
      holderName: record.holderName || "",
      relationship: record.relationship,
      coverageType: record.coverageType,
      coveragePercent: record.coveragePercent || 80,
      deductible: record.deductible || 0,
      expiryDate: record.expiryDate ? format(parseISO(record.expiryDate), 'yyyy-MM-dd') : "",
      status: record.status
    });
    setCreateOpen(true);
  };

  const filtered = insuranceRecords?.filter(r => 
    r.patientName?.toLowerCase().includes(search.toLowerCase()) || 
    r.provider.toLowerCase().includes(search.toLowerCase()) ||
    r.policyNumber.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const total = insuranceRecords?.length || 0;
  const active = insuranceRecords?.filter(r => r.status === 'active').length || 0;
  const expiringSoon = insuranceRecords?.filter(r => {
    if (!r.expiryDate) return false;
    const expiry = parseISO(r.expiryDate);
    return isBefore(expiry, addDays(new Date(), 30)) && isAfter(expiry, new Date());
  }).length || 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="bg-gradient-to-br from-teal-500 to-cyan-600 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 end-0 bg-white/10 w-64 h-64 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("insurance.title")}</h1>
            <p className="text-teal-50 mt-1">{t("insurance.subtitle")}</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20">
              <div className="text-xs text-teal-100">{t("insurance.totalPolicies")}</div>
              <div className="text-2xl font-bold">{total}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20">
              <div className="text-xs text-teal-100">{t("insurance.active")}</div>
              <div className="text-2xl font-bold">{active}</div>
            </div>
            <div className="bg-amber-500/20 backdrop-blur-sm rounded-xl px-4 py-2 border border-amber-500/30 text-amber-50">
              <div className="text-xs">{t("insurance.expiringSoon")}</div>
              <div className="text-2xl font-bold">{expiringSoon}</div>
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
            className="w-full ps-9 pe-4 py-2 bg-card border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-shadow shadow-sm"
          />
        </div>

        <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if(!open) { form.reset(); setEditingId(null); }}}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto rounded-xl bg-teal-600 hover:bg-teal-700 shadow-sm"><Plus className="h-4 w-4 me-2"/> {t("insurance.new")}</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-0 shadow-2xl rounded-2xl">
            <div className="px-6 py-4 border-b bg-slate-50 dark:bg-slate-900/50">
              <DialogTitle className="text-xl">{editingId ? t("insurance.edit") : t("insurance.new")}</DialogTitle>
            </div>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <FormField control={form.control} name="patientId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("common.patient")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value?.toString()}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {patients?.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.firstName} {p.lastName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="provider" render={({ field }) => (
                    <FormItem><FormLabel>{t("insurance.provider")}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="policyNumber" render={({ field }) => (
                    <FormItem><FormLabel>{t("insurance.policy")}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="groupNumber" render={({ field }) => (
                    <FormItem><FormLabel>{t("insurance.group")}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="planName" render={({ field }) => (
                    <FormItem><FormLabel>{t("insurance.plan")}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="holderName" render={({ field }) => (
                    <FormItem><FormLabel>{t("insurance.holder")}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="relationship" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("insurance.relationship")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="self">Self</SelectItem>
                          <SelectItem value="spouse">Spouse</SelectItem>
                          <SelectItem value="child">Child</SelectItem>
                          <SelectItem value="parent">Parent</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="coverageType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("insurance.type")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="comprehensive">Comprehensive</SelectItem>
                          <SelectItem value="basic">Basic</SelectItem>
                          <SelectItem value="dental">Dental</SelectItem>
                          <SelectItem value="vision">Vision</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="coveragePercent" render={({ field }) => (
                    <FormItem><FormLabel>{t("insurance.percent")}</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField control={form.control} name="deductible" render={({ field }) => (
                    <FormItem><FormLabel>{t("insurance.deductible")}</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="expiryDate" render={({ field }) => (
                    <FormItem><FormLabel>{t("common.date")}</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("common.status")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="active">{t("status.active")}</SelectItem>
                          <SelectItem value="inactive">{t("status.inactive")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>{t("common.cancel")}</Button>
                  <Button type="submit" className="bg-teal-600 hover:bg-teal-700" disabled={createIns.isPending || updateIns.isPending}>{t("common.saveChanges")}</Button>
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
                <th className="px-6 py-4">{t("common.patient")}</th>
                <th className="px-6 py-4">{t("insurance.provider")} & {t("insurance.policy")}</th>
                <th className="px-6 py-4">{t("insurance.coverage")}</th>
                <th className="px-6 py-4">{t("common.status")} & {t("common.date")}</th>
                <th className="px-6 py-4 text-end">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground animate-pulse">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground flex flex-col items-center"><ShieldCheck className="h-8 w-8 mb-2 opacity-20"/>{t("insurance.noRecords")}</td></tr>
              ) : filtered.map((r) => {
                
                let isExpiring = false;
                let isExpired = false;
                if (r.expiryDate) {
                  const expiry = parseISO(r.expiryDate);
                  isExpired = isBefore(expiry, new Date());
                  isExpiring = !isExpired && isBefore(expiry, addDays(new Date(), 30));
                }
                
                return (
                  <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-foreground">{r.patientName}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 capitalize">{r.relationship} ({r.holderName || r.patientName})</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-teal-700 dark:text-teal-400">{r.provider}</div>
                      <div className="text-xs font-mono mt-0.5 text-muted-foreground">{r.policyNumber}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                          {r.coverageType}
                        </span>
                        {r.coveragePercent && <span className="font-semibold text-xs">{r.coveragePercent}%</span>}
                      </div>
                      {(r.deductible ?? 0) > 0 && <div className="text-xs text-muted-foreground mt-1">Ded: {new Intl.NumberFormat(numLocale, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(r.deductible ?? 0)}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${r.status === 'active' && !isExpired ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {isExpired ? t("status.inactive") : r.status}
                      </span>
                      {r.expiryDate && (
                        <div className={`text-xs mt-1 flex items-center gap-1 ${isExpired ? 'text-red-500' : isExpiring ? 'text-amber-500 font-medium' : 'text-muted-foreground'}`} dir="ltr">
                          {isExpiring && <AlertCircle className="h-3 w-3" />}
                          {format(parseISO(r.expiryDate), 'MMM d, yyyy', { locale })}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 rounded-lg hover:bg-slate-100"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                          <DropdownMenuItem onClick={() => openEdit(r)} className="rounded-lg cursor-pointer">
                            <Pencil className="me-2 h-4 w-4 text-teal-500" /> {t("common.edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeleteId(r.id)} className="rounded-lg text-destructive focus:bg-destructive/10 cursor-pointer">
                            <Trash2 className="me-2 h-4 w-4" /> {t("common.delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl border-0 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.delete")}</AlertDialogTitle>
            <AlertDialogDescription>{t("insurance.deleteDesc")}</AlertDialogDescription>
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
