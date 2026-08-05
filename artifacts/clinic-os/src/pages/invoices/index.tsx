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
  DollarSign
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
import { useToast } from "@/hooks/use-toast";

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
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data: invoices, isLoading } = useListInvoices(
    statusFilter !== "all" ? { status: statusFilter } : {}
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
            toast({ title: "Invoice updated successfully" });
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
            toast({ title: "Invoice created successfully" });
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
          toast({ title: "Invoice marked as paid" });
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
          toast({ title: "Invoice deleted" });
        }
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing & Invoices</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage patient billing and payments.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] bg-card">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Invoices</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
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
                Create Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Invoice" : "Create New Invoice"}</DialogTitle>
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

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount ($)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
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
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="paid">Paid</SelectItem>
                              <SelectItem value="overdue">Overdue</SelectItem>
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
                        <FormLabel>Description / Services</FormLabel>
                        <FormControl>
                          <Input placeholder="General Consultation" {...field} />
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
                          <FormLabel>Issue Date</FormLabel>
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
                          <FormLabel>Due Date (Optional)</FormLabel>
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
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      disabled={createInvoice.isPending || updateInvoice.isPending}
                    >
                      {(createInvoice.isPending || updateInvoice.isPending) && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {editingId ? "Save Changes" : "Create Invoice"}
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
                <th className="px-6 py-4 font-medium">Invoice ID</th>
                <th className="px-6 py-4 font-medium">Patient</th>
                <th className="px-6 py-4 font-medium">Description</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium text-right">Amount</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
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
                    No invoices found.
                  </td>
                </tr>
              ) : (
                invoices?.map((inv) => (
                  <tr key={inv.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-6 py-4 font-mono text-xs">
                      INV-{inv.id.toString().padStart(5, '0')}
                    </td>
                    <td className="px-6 py-4 font-medium text-foreground">
                      {inv.patientName}
                    </td>
                    <td className="px-6 py-4">
                      {inv.description}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-foreground">{format(parseISO(inv.issuedDate), 'MMM d, yyyy')}</div>
                      {inv.dueDate && (
                        <div className="text-xs text-muted-foreground mt-0.5">Due: {format(parseISO(inv.dueDate), 'MMM d, yyyy')}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-foreground">
                      ${inv.amount.toFixed(2)}
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
                        {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
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
                            Pay
                          </Button>
                        )}
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            {inv.status !== 'paid' && (
                              <DropdownMenuItem onClick={() => handleMarkPaid(inv.id)}>
                                Mark as Paid
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleEdit(inv)}>
                              <Pencil className="mr-2 h-4 w-4" /> Edit Invoice
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive focus:bg-destructive/10"
                              onClick={() => setDeletingId(inv.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
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

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the billing record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteInvoice.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteInvoice.isPending}
            >
              {deleteInvoice.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
