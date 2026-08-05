import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { 
  useListPayments, 
  useCreatePayment, 
  useUpdatePayment, 
  useDeletePayment,
  useListPatients,
  useListAppointments
} from "@workspace/api-client-react";
import { 
  CreditCard, 
  Search, 
  Plus, 
  MoreVertical, 
  Trash2,
  Pencil,
  FileText
} from "lucide-react";
import { useTranslation } from "@/i18n/context";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
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

const paymentSchema = z.object({
  patientId: z.coerce.number().min(1, "Required"),
  invoiceId: z.coerce.number().optional().or(z.literal('')),
  amount: z.coerce.number().min(0.01, "Must be > 0"),
  method: z.string().min(1, "Required"),
  reference: z.string().optional(),
  notes: z.string().optional(),
  paymentDate: z.string().min(1, "Required"),
  status: z.string().optional()
});

export default function PaymentsList() {
  const { t, isRtl } = useTranslation();
  const locale = isRtl ? arLocale : enUS;
  const numLocale = isRtl ? 'ar-AE' : 'en-US';
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { role, doctorId } = useAuth();

  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: allPayments, isLoading } = useListPayments();
  const { data: patients } = useListPatients();
  const { data: appts } = useListAppointments(role === 'doctor' ? { doctorId } : undefined);

  const createPayment = useCreatePayment();
  const deletePayment = useDeletePayment();

  // If doctor, compute their patient IDs and filter payments
  const doctorPatientIds = role === 'doctor' && appts 
    ? new Set(appts.map(a => a.patientId)) 
    : null;

  const payments = role === 'doctor' && doctorPatientIds && allPayments
    ? allPayments.filter(p => doctorPatientIds.has(p.patientId))
    : allPayments;

  const form = useForm<z.infer<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentDate: format(new Date(), 'yyyy-MM-dd'),
      method: "cash",
      status: "completed"
    }
  });

  const onSubmit = (values: z.infer<typeof paymentSchema>) => {
    // API requires empty invoiceId to be undefined, not ''
    const dataToSubmit = {
      ...values,
      invoiceId: values.invoiceId === '' ? undefined : values.invoiceId
    };

    createPayment.mutate({ data: dataToSubmit as any }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
        setCreateOpen(false);
        form.reset();
        toast({ title: t("payments.created") });
      }
    });
  };

  const onDelete = () => {
    if (!deleteId) return;
    deletePayment.mutate({ id: deleteId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
        setDeleteId(null);
        toast({ title: t("payments.deleted") });
      }
    });
  };

  const filtered = payments?.filter(p => 
    p.patientName?.toLowerCase().includes(search.toLowerCase()) || 
    p.reference?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const totalCollected = payments?.filter(p => p.status === 'completed').reduce((acc, curr) => acc + curr.amount, 0) || 0;
  const pendingAmount = payments?.filter(p => p.status === 'pending').reduce((acc, curr) => acc + curr.amount, 0) || 0;
  const todayCount = payments?.filter(p => p.paymentDate.startsWith(format(new Date(), 'yyyy-MM-dd'))).length || 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="bg-gradient-to-br from-indigo-600 to-blue-600 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 end-0 bg-white/10 w-64 h-64 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("payments.title")}</h1>
            <p className="text-indigo-100 mt-1">{t("payments.subtitle")}</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20">
              <div className="text-xs text-indigo-100">{t("payments.collected")}</div>
              <div className="text-2xl font-bold" dir="ltr">{new Intl.NumberFormat(numLocale, { style: 'currency', currency: 'USD' }).format(totalCollected)}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20">
              <div className="text-xs text-indigo-100">{t("payments.pendingAmt")}</div>
              <div className="text-2xl font-bold" dir="ltr">{new Intl.NumberFormat(numLocale, { style: 'currency', currency: 'USD' }).format(pendingAmount)}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20">
              <div className="text-xs text-indigo-100">{t("payments.todayCount")}</div>
              <div className="text-2xl font-bold">{todayCount}</div>
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
            className="w-full ps-9 pe-4 py-2 bg-card border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-shadow shadow-sm"
          />
        </div>

        <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if(!open) form.reset(); }}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-sm"><Plus className="h-4 w-4 me-2"/> {t("payments.new")}</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-0 shadow-2xl rounded-2xl">
            <div className="px-6 py-4 border-b bg-slate-50 dark:bg-slate-900/50">
              <DialogTitle className="text-xl">{t("payments.new")}</DialogTitle>
            </div>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-4">
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
                  <FormField control={form.control} name="amount" render={({ field }) => (
                    <FormItem><FormLabel>{t("common.amount")}</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="invoiceId" render={({ field }) => (
                    <FormItem><FormLabel>{t("payments.invoiceId")}</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl></FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="method" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("payments.method")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="card">Card</SelectItem>
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                          <SelectItem value="insurance">Insurance</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="paymentDate" render={({ field }) => (
                    <FormItem><FormLabel>{t("common.date")}</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="reference" render={({ field }) => (
                  <FormItem><FormLabel>{t("payments.reference")}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem><FormLabel>{t("common.notes")}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>{t("common.cancel")}</Button>
                  <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={createPayment.isPending}>{t("common.saveChanges")}</Button>
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
                <th className="px-6 py-4">{t("common.amount")} & {t("payments.method")}</th>
                <th className="px-6 py-4">{t("common.status")}</th>
                <th className="px-6 py-4">{t("common.date")}</th>
                <th className="px-6 py-4 text-end">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground animate-pulse">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground flex flex-col items-center"><CreditCard className="h-8 w-8 mb-2 opacity-20"/>{t("payments.noPayments")}</td></tr>
              ) : filtered.map((p) => {
                const methodColors: Record<string, string> = {
                  cash: 'bg-slate-100 text-slate-700',
                  card: 'bg-blue-100 text-blue-700',
                  bank_transfer: 'bg-emerald-100 text-emerald-700',
                  insurance: 'bg-purple-100 text-purple-700'
                };
                
                return (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-foreground">{p.patientName}</div>
                      {p.invoiceId && <div className="text-xs text-muted-foreground mt-0.5 font-mono">INV-{p.invoiceId}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-foreground font-mono" dir="ltr">
                        {new Intl.NumberFormat(numLocale, { style: 'currency', currency: 'USD' }).format(p.amount)}
                      </div>
                      <span className={`inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${methodColors[p.method] || 'bg-slate-100 text-slate-700'}`}>
                        {p.method.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${p.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : p.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                        {p.status}
                      </span>
                      {p.reference && <div className="text-[10px] text-muted-foreground mt-1 font-mono uppercase tracking-wider">{p.reference}</div>}
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground whitespace-nowrap" dir="ltr">
                      {format(parseISO(p.paymentDate), 'MMM d, yyyy', { locale })}
                    </td>
                    <td className="px-6 py-4 text-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 rounded-lg hover:bg-slate-100"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                          <DropdownMenuItem onClick={() => setDeleteId(p.id)} className="rounded-lg text-destructive focus:bg-destructive/10 cursor-pointer">
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
            <AlertDialogDescription>{t("payments.deleteDesc")}</AlertDialogDescription>
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
