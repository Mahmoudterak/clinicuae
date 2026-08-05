import { useState } from "react";
import { 
  useListInventory, 
  useCreateInventoryItem, 
  useUpdateInventoryItem, 
  useDeleteInventoryItem
} from "@workspace/api-client-react";
import { 
  Package, 
  Search, 
  Plus, 
  MoreVertical, 
  Trash2,
  AlertTriangle,
  Pencil
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

const invSchema = z.object({
  name: z.string().min(1, "Required"),
  category: z.string().min(1, "Required"),
  sku: z.string().optional(),
  quantity: z.coerce.number().min(0),
  minQuantity: z.coerce.number().min(0),
  unit: z.string().min(1, "Required"),
  costPerUnit: z.coerce.number().optional(),
  supplier: z.string().optional(),
  location: z.string().optional(),
  status: z.string().optional()
});

export default function InventoryList() {
  const { t, isRtl } = useTranslation();
  const numLocale = isRtl ? 'ar-AE' : 'en-US';
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: items, isLoading } = useListInventory();
  const createItem = useCreateInventoryItem();
  const updateItem = useUpdateInventoryItem();
  const deleteItem = useDeleteInventoryItem();

  const form = useForm<z.infer<typeof invSchema>>({
    resolver: zodResolver(invSchema),
    defaultValues: {
      quantity: 0,
      minQuantity: 5,
      unit: "pcs",
      status: "in_stock"
    }
  });

  const onSubmit = (values: z.infer<typeof invSchema>) => {
    if (editingItem) {
      updateItem.mutate({ id: editingItem.id, data: values }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
          setCreateOpen(false);
          setEditingItem(null);
          toast({ title: t("inventory.updated") });
        }
      });
    } else {
      createItem.mutate({ data: values }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
          setCreateOpen(false);
          form.reset();
          toast({ title: t("inventory.created") });
        }
      });
    }
  };

  const onDelete = () => {
    if (!deleteId) return;
    deleteItem.mutate({ id: deleteId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
        setDeleteId(null);
        toast({ title: t("inventory.deleted") });
      }
    });
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    form.reset({
      name: item.name,
      category: item.category,
      sku: item.sku || "",
      quantity: item.quantity,
      minQuantity: item.minQuantity,
      unit: item.unit,
      costPerUnit: item.costPerUnit || 0,
      supplier: item.supplier || "",
      location: item.location || "",
      status: item.status
    });
    setCreateOpen(true);
  };

  const filtered = items?.filter(i => 
    i.name.toLowerCase().includes(search.toLowerCase()) || 
    i.category.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const total = items?.length || 0;
  const lowStock = items?.filter(i => i.quantity > 0 && i.quantity <= i.minQuantity).length || 0;
  const totalValue = items?.reduce((acc, curr) => acc + (curr.quantity * (curr.costPerUnit || 0)), 0) || 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 end-0 bg-white/10 w-64 h-64 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("inventory.title")}</h1>
            <p className="text-amber-100 mt-1">{t("inventory.subtitle")}</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20">
              <div className="text-xs text-amber-100">{t("inventory.totalItems")}</div>
              <div className="text-2xl font-bold">{total}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20">
              <div className="text-xs text-amber-100">{t("inventory.lowStock")}</div>
              <div className="text-2xl font-bold">{lowStock}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20">
              <div className="text-xs text-amber-100">{t("inventory.totalValue")}</div>
              <div className="text-2xl font-bold" dir="ltr">
                {new Intl.NumberFormat(numLocale, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalValue)}
              </div>
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
            className="w-full ps-9 pe-4 py-2 bg-card border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-shadow shadow-sm"
          />
        </div>

        <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if(!open) { form.reset(); setEditingItem(null); }}}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto rounded-xl bg-amber-600 hover:bg-amber-700 shadow-sm"><Plus className="h-4 w-4 me-2"/> {t("inventory.newItem")}</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-0 shadow-2xl rounded-2xl">
            <div className="px-6 py-4 border-b bg-slate-50 dark:bg-slate-900/50">
              <DialogTitle className="text-xl">{editingItem ? t("inventory.editItem") : t("inventory.newItem")}</DialogTitle>
            </div>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>{t("inventory.name")}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem><FormLabel>{t("inventory.category")}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <FormField control={form.control} name="sku" render={({ field }) => (
                    <FormItem><FormLabel>{t("inventory.sku")}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="quantity" render={({ field }) => (
                    <FormItem><FormLabel>{t("inventory.qty")}</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="minQuantity" render={({ field }) => (
                    <FormItem><FormLabel>{t("inventory.minQty")}</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="unit" render={({ field }) => (
                    <FormItem><FormLabel>{t("inventory.unit")}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField control={form.control} name="costPerUnit" render={({ field }) => (
                    <FormItem><FormLabel>{t("inventory.costUnit")}</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="supplier" render={({ field }) => (
                    <FormItem><FormLabel>{t("inventory.supplier")}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="location" render={({ field }) => (
                    <FormItem><FormLabel>{t("inventory.location")}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                </div>
                
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("common.status")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="in_stock">{t("inventory.inStock")}</SelectItem>
                        <SelectItem value="low_stock">{t("inventory.lowStock")}</SelectItem>
                        <SelectItem value="out_of_stock">{t("inventory.outOfStock")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>{t("common.cancel")}</Button>
                  <Button type="submit" className="bg-amber-600 hover:bg-amber-700" disabled={createItem.isPending || updateItem.isPending}>{t("common.saveChanges")}</Button>
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
                <th className="px-6 py-4">{t("inventory.name")}</th>
                <th className="px-6 py-4">{t("inventory.category")} & {t("inventory.location")}</th>
                <th className="px-6 py-4">{t("inventory.qty")}</th>
                <th className="px-6 py-4">{t("common.status")}</th>
                <th className="px-6 py-4 text-end">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground animate-pulse">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground flex flex-col items-center"><Package className="h-8 w-8 mb-2 opacity-20"/>{t("inventory.noItems")}</td></tr>
              ) : filtered.map((item) => {
                const isLow = item.quantity > 0 && item.quantity <= item.minQuantity;
                const isOut = item.quantity === 0;
                
                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-foreground">{item.name}</div>
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">{item.sku || '---'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-amber-600 dark:text-amber-400">{item.category}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{item.location || '---'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`font-bold flex items-center gap-2 ${isOut ? 'text-red-500' : isLow ? 'text-amber-500' : 'text-foreground'}`}>
                        {item.quantity} {item.unit}
                        {(isOut || isLow) && <AlertTriangle className="h-4 w-4" />}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">Min: {item.minQuantity}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium 
                        ${isOut || item.status === 'out_of_stock' ? 'bg-red-100 text-red-700' : 
                          isLow || item.status === 'low_stock' ? 'bg-amber-100 text-amber-700' : 
                          'bg-emerald-100 text-emerald-700'}`}>
                        {t(isOut ? "inventory.outOfStock" : isLow ? "inventory.lowStock" : "inventory.inStock")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 rounded-lg hover:bg-slate-100"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                          <DropdownMenuItem onClick={() => openEdit(item)} className="rounded-lg cursor-pointer">
                            <Pencil className="me-2 h-4 w-4 text-amber-500" /> {t("common.edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeleteId(item.id)} className="rounded-lg text-destructive focus:bg-destructive/10 cursor-pointer">
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
            <AlertDialogTitle>{t("inventory.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("inventory.deleteDesc")}</AlertDialogDescription>
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
