import { useAuth } from "@/contexts/auth-context";
import { useSettings } from "@/contexts/settings-context";
import { useState } from "react";
import { 
  useListInvoices, 
  useCreateInvoice, 
  useUpdateInvoice, 
  useDeleteInvoice,
  getListInvoicesQueryKey,
  useListPatients
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Plus, 
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  Printer,
  MessageSquare
} from "lucide-react";
import { useSendWaMessage, useListWaMessages } from "@/hooks/use-whatsapp";
import { resolveLogoDataUrl } from "@/lib/logo-utils";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, parseISO } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import { useTranslation } from "@/i18n/context";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { useToast } from "@/hooks/use-toast";
import { generateInvoicePDF } from "@/lib/pdf-utils";

const invoiceSchema = z.object({
  patientId: z.coerce.number().min(1, "Patient is required"),
  amount: z.coerce.number().min(0, "Amount must be positive"),
  description: z.string().min(1, "Description is required"),
  issuedDate: z.string().min(1, "Issue date is required"),
  dueDate: z.string().optional(),
  status: z.string().default("pending"),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

export default function InvoicesList() {
  const { t, isRtl } = useTranslation();
  const locale = isRtl ? arLocale : enUS;
  const { settings } = useSettings();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data: invoices, isLoading } = useListInvoices(
    statusFilter !== "all" ? { status: statusFilter } : undefined
  );
  const { data: patients } = useListPatients();
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const deleteInvoice = useDeleteInvoice();
  const sendWaMessage = useSendWaMessage();
  const { data: waMessages } = useListWaMessages();

  // Returns the most recent WA message sent for a given invoice (matched by invoice number in body)
  const getInvoiceWaMessage = (inv: any) => {
    if (!waMessages) return null;
    const invNum = `INV-${inv.id.toString().padStart(5, "0")}`;
    return (
      waMessages.find(
        (m) =>
          m.patientId === inv.patientId &&
          m.body.includes(invNum) &&
          (m.status === "sent" || m.status === "simulated")
      ) ?? null
    );
  };

  // WhatsApp dialog state
  const [waInvoice, setWaInvoice] = useState<any | null>(null);
  const [waPhone, setWaPhone] = useState("");
  const [waBody, setWaBody] = useState("");
  const [waOpen, setWaOpen] = useState(false);

  const handleOpenWhatsapp = (inv: any) => {
    const patient = patients?.find(p => p.id === inv.patientId);
    const phone = patient?.phone ?? "";
    const invNum = `INV-${inv.id.toString().padStart(5, "0")}`;
    const amount = new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED" }).format(inv.amount);
    const dateStr = inv.issuedDate;
    const msg = isRtl
      ? `مرحباً ${inv.patientName}،\n\nيرجى الاطلاع على فاتورتك:\nرقم الفاتورة: ${invNum}\nالوصف: ${inv.description}\nالمبلغ: ${amount}\nتاريخ الإصدار: ${dateStr}\n\nشكراً لاختياركم عيادتنا.`
      : `Hello ${inv.patientName},\n\nPlease find your invoice details below:\nInvoice #: ${invNum}\nDescription: ${inv.description}\nAmount: ${amount}\nIssued: ${dateStr}\n\nThank you for choosing our clinic.`;
    setWaInvoice(inv);
    setWaPhone(phone);
    setWaBody(msg);
    setWaOpen(true);
  };

  const handleSendWhatsapp = async () => {
    if (!waInvoice || !waPhone.trim() || !waBody.trim()) return;
    try {
      const result: any = await sendWaMessage.mutateAsync({
        patientId: waInvoice.patientId ?? null,
        patientPhone: waPhone,
        patientName: waInvoice.patientName,
        body: waBody,
      });
      setWaOpen(false);
      if (result?.simulated) {
        toast({ title: t("invoices.whatsappSimulated") });
      } else {
        toast({ title: t("invoices.whatsappSent") });
      }
    } catch {
      toast({ title: t("invoices.whatsappError"), variant: "destructive" });
    }
  };

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      patientId: 0,
      amount: 0,
      description: "",
      issuedDate: new Date().toISOString().split('T')[0],
      dueDate: "",
      status: "pending",
    }
  });

  const onSubmit = (data: InvoiceFormValues) => {
    if (editingId) {
      updateInvoice.mutate(
        { id: editingId, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
            setIsCreateOpen(false);
            setEditingId(null);
            form.reset();
            toast({ title: t("invoices.updated") });
          }
        }
      );
    } else {
      createInvoice.mutate(
        { data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
            setIsCreateOpen(false);
            form.reset();
            toast({ title: t("invoices.created") });
          }
        }
      );
    }
  };

  const handleEdit = (invoice: any) => {
    form.reset({
      patientId: invoice.patientId,
      amount: invoice.amount,
      description: invoice.description,
      issuedDate: invoice.issuedDate,
      dueDate: invoice.dueDate || "",
      status: invoice.status,
    });
    setEditingId(invoice.id);
    setIsCreateOpen(true);
  };

  const handleMarkPaid = (id: number) => {
    updateInvoice.mutate(
      { id, data: { status: "paid", paidDate: new Date().toISOString().split('T')[0] } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
          toast({ title: t("invoices.markedPaid") });
        }
      }
    );
  };

  const handleDelete = () => {
    if (!deletingId) return;
    deleteInvoice.mutate(
      { id: deletingId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
          setDeletingId(null);
          toast({ title: t("invoices.deleted") });
        }
      }
    );
  };

  const handlePrintInvoice = async (inv: any) => {
    const logoDataUrl = await resolveLogoDataUrl(settings.clinic.logoDataUrl);
    generateInvoicePDF({
      id: inv.id,
      patientName: inv.patientName,
      description: inv.description,
      amount: inv.amount,
      status: inv.status,
      issuedDate: inv.issuedDate,
      dueDate: inv.dueDate,
      paidDate: inv.paidDate,
      clinicName: settings.clinic.clinicName,
      clinicAddress: settings.clinic.address || undefined,
      clinicPhone: settings.clinic.phone || undefined,
      clinicEmail: settings.clinic.email || undefined,
      logoDataUrl,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("invoices.title")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("invoices.subtitle")}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] bg-card">
              <SelectValue placeholder={t("invoices.filterStatus")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("invoices.allInvoices")}</SelectItem>
              <SelectItem value="pending">{t("status.pending")}</SelectItem>
              <SelectItem value="paid">{t("status.paid")}</SelectItem>
              <SelectItem value="overdue">{t("status.overdue")}</SelectItem>
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
                {t("invoices.createInvoice")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editingId ? t("invoices.editInvoice") : t("invoices.createNew")}</DialogTitle>
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

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("common.amount")} (AED)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" dir="ltr" {...field} />
                          </FormControl>
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
                              <SelectItem value="pending">{t("status.pending")}</SelectItem>
                              <SelectItem value="paid">{t("status.paid")}</SelectItem>
                              <SelectItem value="overdue">{t("status.overdue")}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("invoices.services")}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="issuedDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("invoices.issueDate")}</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="dueDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("invoices.dueDate")}</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <DialogFooter className="pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsCreateOpen(false)}
                      disabled={createInvoice.isPending || updateInvoice.isPending}
                    >
                      {t("common.cancel")}
                    </Button>
                    <Button 
                      type="submit"
                      disabled={createInvoice.isPending || updateInvoice.isPending}
                    >
                      {(createInvoice.isPending || updateInvoice.isPending) && (
                        <Loader2 className="me-2 h-4 w-4 animate-spin" />
                      )}
                      {editingId ? t("common.saveChanges") : t("invoices.createInvoice")}
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
                <th className="px-6 py-4 font-medium">{t("patientDetail.invoiceNum")}</th>
                <th className="px-6 py-4 font-medium">{t("common.patient")}</th>
                <th className="px-6 py-4 font-medium">{t("patientDetail.description")}</th>
                <th className="px-6 py-4 font-medium">{t("common.date")}</th>
                <th className="px-6 py-4 font-medium text-end">{t("common.amount")}</th>
                <th className="px-6 py-4 font-medium">{t("common.status")}</th>
                <th className="px-6 py-4 font-medium text-end">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : invoices?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                    {t("invoices.noInvoices")}
                  </td>
                </tr>
              ) : (
                invoices?.map((inv) => (
                  <tr key={inv.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-6 py-4 font-mono text-xs">
                      INV-{inv.id.toString().padStart(5, '0')}
                    </td>
                    <td className="px-6 py-4 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <span>{inv.patientName}</span>
                        {(() => {
                          const waMsg = getInvoiceWaMessage(inv);
                          if (!waMsg) return null;
                          const sentTime = waMsg.sentAt ?? waMsg.createdAt;
                          const formattedTime = format(new Date(sentTime), "MMM d, yyyy HH:mm", { locale });
                          const label = waMsg.status === "simulated"
                            ? t("invoices.whatsappBadgeSimulated", { date: formattedTime })
                            : t("invoices.whatsappBadgeSent", { date: formattedTime });
                          return (
                            <TooltipProvider delayDuration={200}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-green-500/10 text-green-600 border border-green-500/20 cursor-pointer shrink-0 hover:bg-green-500/20 transition-colors"
                                    onClick={(e) => { e.stopPropagation(); handleOpenWhatsapp(inv); }}
                                  >
                                    <MessageSquare className="h-2.5 w-2.5" />
                                    WA
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p>{label}</p>
                                  <p className="text-[10px] opacity-70 mt-0.5">{t("invoices.whatsappBadgeResend")}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {inv.description}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-foreground">{format(parseISO(inv.issuedDate), 'MMM d, yyyy', { locale })}</div>
                      {inv.dueDate && (
                        <div className="text-xs text-muted-foreground mt-0.5">Due: {format(parseISO(inv.dueDate), 'MMM d, yyyy', { locale })}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-end font-semibold text-foreground" dir="ltr">
                      {new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(inv.amount)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        inv.status === 'paid' ? 'bg-emerald-500/10 text-emerald-600' :
                        inv.status === 'overdue' ? 'bg-destructive/10 text-destructive' :
                        'bg-amber-500/10 text-amber-600'
                      }`}>
                        {inv.status === 'paid' && <CheckCircle2 className="h-3.5 w-3.5" />}
                        {inv.status === 'overdue' && <XCircle className="h-3.5 w-3.5" />}
                        {inv.status === 'pending' && <Clock className="h-3.5 w-3.5" />}
                        {t(`status.${inv.status}`)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-end">
                      <div className="flex items-center justify-end gap-2">
                        {inv.status !== 'paid' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 gap-1 border-emerald-500 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 hidden group-hover:flex"
                            onClick={() => handleMarkPaid(inv.id)}
                            disabled={updateInvoice.isPending}
                          >
                            <DollarSign className="h-3.5 w-3.5" />
                            {t("invoices.pay")}
                          </Button>
                        )}
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{t("common.actions")}</DropdownMenuLabel>
                            {inv.status !== 'paid' && (
                              <DropdownMenuItem onClick={() => handleMarkPaid(inv.id)}>
                                {t("invoices.markPaid")}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handlePrintInvoice(inv)}>
                              <Printer className="me-2 h-4 w-4" /> {t("invoices.printInvoice")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleEdit(inv)}>
                              <Pencil className="me-2 h-4 w-4" /> {t("invoices.editInvoice")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenWhatsapp(inv)}>
                              <MessageSquare className="me-2 h-4 w-4 text-green-600" />
                              <span className="text-green-700 dark:text-green-400">{t("invoices.sendWhatsapp")}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive focus:bg-destructive/10"
                              onClick={() => setDeletingId(inv.id)}
                            >
                              <Trash2 className="me-2 h-4 w-4" /> {t("common.delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* WhatsApp Send Dialog */}
      <Dialog open={waOpen} onOpenChange={(open) => { setWaOpen(open); if (!open) setWaInvoice(null); }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-green-500 flex items-center justify-center text-white font-bold text-sm shadow shadow-green-500/30">W</div>
              {t("invoices.whatsappTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium leading-none">{t("invoices.whatsappPhone")}</label>
              <Input
                value={waPhone}
                onChange={e => setWaPhone(e.target.value)}
                placeholder="+971500000000"
                dir="ltr"
              />
              {waInvoice && !patients?.find(p => p.id === waInvoice.patientId)?.phone && (
                <p className="text-xs text-amber-600">{t("invoices.whatsappNoPhone")}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium leading-none">{t("invoices.whatsappMessage")}</label>
              <Textarea
                value={waBody}
                onChange={e => setWaBody(e.target.value)}
                rows={7}
                className="resize-none font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground text-end">{waBody.length} {isRtl ? "حرف" : "chars"}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWaOpen(false)} disabled={sendWaMessage.isPending}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleSendWhatsapp}
              disabled={sendWaMessage.isPending || !waPhone.trim() || !waBody.trim()}
              className="gap-2 bg-green-600 hover:bg-green-700 text-white"
            >
              {sendWaMessage.isPending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <MessageSquare className="h-4 w-4" />}
              {t("invoices.whatsappSend")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("invoices.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("invoices.deleteDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteInvoice.isPending}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteInvoice.isPending}
            >
              {deleteInvoice.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
