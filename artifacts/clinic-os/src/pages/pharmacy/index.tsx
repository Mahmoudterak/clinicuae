import { useState } from "react";
import { 
  useListMedications, 
  useCreateMedication, 
  useUpdateMedication, 
  useDeleteMedication
} from "@workspace/api-client-react";
import { 
  Pill, 
  Search, 
  Plus, 
  MoreVertical, 
  Trash2,
  AlertTriangle,
  Pencil,
  PackagePlus
} from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const medSchema = z.object({
  name: z.string().min(1, "Required"),
  genericName: z.string().optional(),
  category: z.string().min(1, "Required"),
  form: z.string().min(1, "Required"),
  strength: z.string().optional(),
  unit: z.string().min(1, "Required"),
  stockQuantity: z.coerce.number().min(0),
  minStockLevel: z.coerce.number().min(0),
  pricePerUnit: z.coerce.number().optional(),
  status: z.string().optional()
});

export default function PharmacyList() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<any>(null);
  const [restockMed, setRestockMed] = useState<any>(null);
  const [restockQty, setRestockQty] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: meds, isLoading } = useListMedications();
  const createMed = useCreateMedication();
  const updateMed = useUpdateMedication();
  const deleteMed = useDeleteMedication();

  const form = useForm<z.infer<typeof medSchema>>({
    resolver: zodResolver(medSchema),
    defaultValues: {
      stockQuantity: 0,
      minStockLevel: 10,
      unit: "tablets",
      status: "active"
    }
  });

  const onSubmit = (values: z.infer<typeof medSchema>) => {
    if (editingMed) {
      updateMed.mutate({ id: editingMed.id, data: values }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/medications"] });
          setCreateOpen(false);
          setEditingMed(null);
          toast({ title: t("pharmacy.updated") });
        }
      });
    } else {
      createMed.mutate({ data: values }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/medications"] });
          setCreateOpen(false);
          form.reset();
          toast({ title: t("pharmacy.created") });
        }
      });
    }
  };

  const handleRestock = () => {
    if (!restockMed || !restockQty) return;
    const newQty = restockMed.stockQuantity + parseInt(restockQty);
    
    // API requires the full MedicationInput for updateMedication
    const fullMedData = {
      name: restockMed.name,
      genericName: restockMed.genericName || undefined,
      category: restockMed.category,
      form: restockMed.form,
      strength: restockMed.strength || undefined,
      unit: restockMed.unit,
      minStockLevel: restockMed.minStockLevel,
      pricePerUnit: restockMed.pricePerUnit || undefined,
      status: restockMed.status,
      stockQuantity: newQty
    };
    
    updateMed.mutate({ id: restockMed.id, data: fullMedData }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/medications"] });
        setRestockMed(null);
        setRestockQty("");
        toast({ title: t("pharmacy.updated") });
      }
    });
  };

  const onDelete = () => {
    if (!deleteId) return;
    deleteMed.mutate({ id: deleteId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/medications"] });
        setDeleteId(null);
        toast({ title: t("pharmacy.deleted") });
      }
    });
  };

  const openEdit = (med: any) => {
    setEditingMed(med);
    form.reset({
      name: med.name,
      genericName: med.genericName || "",
      category: med.category,
      form: med.form,
      strength: med.strength || "",
      unit: med.unit,
      stockQuantity: med.stockQuantity,
      minStockLevel: med.minStockLevel,
      pricePerUnit: med.pricePerUnit || 0,
      status: med.status
    });
    setCreateOpen(true);
  };

  const filtered = meds?.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) || 
    m.genericName?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const total = meds?.length || 0;
  const lowStock = meds?.filter(m => m.stockQuantity > 0 && m.stockQuantity <= m.minStockLevel).length || 0;
  const outOfStock = meds?.filter(m => m.stockQuantity === 0).length || 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 end-0 bg-white/10 w-64 h-64 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("pharmacy.title")}</h1>
            <p className="text-emerald-50 mt-1">{t("pharmacy.subtitle")}</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20">
              <div className="text-xs text-emerald-100">{t("pharmacy.totalMedications")}</div>
              <div className="text-2xl font-bold">{total}</div>
            </div>
            <div className="bg-amber-500/20 backdrop-blur-sm rounded-xl px-4 py-2 border border-amber-500/30 text-amber-50">
              <div className="text-xs">{t("pharmacy.lowStock")}</div>
              <div className="text-2xl font-bold">{lowStock}</div>
            </div>
            <div className="bg-red-500/20 backdrop-blur-sm rounded-xl px-4 py-2 border border-red-500/30 text-red-50">
              <div className="text-xs">{t("pharmacy.outOfStock")}</div>
              <div className="text-2xl font-bold">{outOfStock}</div>
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
            className="w-full ps-9 pe-4 py-2 bg-card border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-shadow shadow-sm"
          />
        </div>

        <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if(!open) { form.reset(); setEditingMed(null); }}}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto rounded-xl bg-emerald-600 hover:bg-emerald-700 shadow-sm"><Plus className="h-4 w-4 me-2"/> {t("pharmacy.newMedication")}</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-0 shadow-2xl rounded-2xl">
            <div className="px-6 py-4 border-b bg-slate-50 dark:bg-slate-900/50">
              <DialogTitle className="text-xl">{editingMed ? t("pharmacy.editMedication") : t("pharmacy.newMedication")}</DialogTitle>
            </div>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>{t("pharmacy.name")}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="genericName" render={({ field }) => (
                    <FormItem><FormLabel>{t("pharmacy.genericName")}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem><FormLabel>{t("pharmacy.category")}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="form" render={({ field }) => (
                    <FormItem><FormLabel>{t("pharmacy.form")}</FormLabel><FormControl><Input {...field} placeholder="Tablet, Syrup..." /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="strength" render={({ field }) => (
                    <FormItem><FormLabel>{t("pharmacy.strength")}</FormLabel><FormControl><Input {...field} placeholder="500mg" /></FormControl></FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <FormField control={form.control} name="stockQuantity" render={({ field }) => (
                    <FormItem><FormLabel>{t("pharmacy.stockQty")}</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="minStockLevel" render={({ field }) => (
                    <FormItem><FormLabel>{t("pharmacy.minLevel")}</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="unit" render={({ field }) => (
                    <FormItem><FormLabel>{t("inventory.unit")}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="pricePerUnit" render={({ field }) => (
                    <FormItem><FormLabel>{t("pharmacy.priceUnit")}</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl></FormItem>
                  )} />
                </div>
                
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("common.status")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="active">{t("pharmacy.active")}</SelectItem>
                        <SelectItem value="inactive">{t("pharmacy.inactive")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>{t("common.cancel")}</Button>
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={createMed.isPending || updateMed.isPending}>{t("common.saveChanges")}</Button>
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
                <th className="px-6 py-4">{t("pharmacy.name")}</th>
                <th className="px-6 py-4">{t("pharmacy.category")} & {t("pharmacy.form")}</th>
                <th className="px-6 py-4">{t("pharmacy.stockQty")}</th>
                <th className="px-6 py-4">{t("common.status")}</th>
                <th className="px-6 py-4 text-end">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground animate-pulse">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground flex flex-col items-center"><Pill className="h-8 w-8 mb-2 opacity-20"/>{t("pharmacy.noMedications")}</td></tr>
              ) : filtered.map((med) => {
                const isLow = med.stockQuantity > 0 && med.stockQuantity <= med.minStockLevel;
                const isOut = med.stockQuantity === 0;
                
                return (
                  <tr key={med.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-foreground flex items-center gap-2">
                        {med.name} 
                        {med.strength && <span className="text-xs font-normal text-muted-foreground bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{med.strength}</span>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{med.genericName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-emerald-600 dark:text-emerald-400">{med.category}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{med.form}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`font-bold flex items-center gap-2 ${isOut ? 'text-red-500' : isLow ? 'text-amber-500' : 'text-foreground'}`}>
                        {med.stockQuantity} {med.unit}
                        {(isOut || isLow) && <AlertTriangle className="h-4 w-4" />}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">Min: {med.minStockLevel}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${med.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                        {t(`pharmacy.${med.status}`)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 rounded-lg hover:bg-slate-100"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                          <DropdownMenuItem onClick={() => setRestockMed(med)} className="rounded-lg cursor-pointer">
                            <PackagePlus className="me-2 h-4 w-4 text-emerald-500" /> {t("pharmacy.restock")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(med)} className="rounded-lg cursor-pointer">
                            <Pencil className="me-2 h-4 w-4" /> {t("common.edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeleteId(med.id)} className="rounded-lg text-destructive focus:bg-destructive/10 cursor-pointer">
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

      <Dialog open={!!restockMed} onOpenChange={() => setRestockMed(null)}>
        <DialogContent className="sm:max-w-[300px] rounded-2xl">
          <DialogTitle>{t("pharmacy.addStock")}</DialogTitle>
          <div className="py-4">
            <p className="text-sm font-medium mb-2">{restockMed?.name}</p>
            <Input type="number" placeholder="Quantity to add" value={restockQty} onChange={(e) => setRestockQty(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRestockMed(null)}>{t("common.cancel")}</Button>
            <Button onClick={handleRestock} className="bg-emerald-600 hover:bg-emerald-700" disabled={!restockQty || updateMed.isPending}>{t("pharmacy.restock")}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl border-0 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("pharmacy.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("pharmacy.deleteDesc")}</AlertDialogDescription>
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
