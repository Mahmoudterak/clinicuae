import { useState } from "react";
import { 
  useListDepartments, 
  useCreateDepartment, 
  useUpdateDepartment, 
  useDeleteDepartment
} from "@workspace/api-client-react";
import { 
  Building2, 
  Search, 
  Plus, 
  Trash2,
  Pencil,
  Phone,
  MapPin,
  Users
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const deptSchema = z.object({
  name: z.string().min(1, "Required"),
  nameAr: z.string().optional(),
  head: z.string().optional(),
  location: z.string().optional(),
  phone: z.string().optional(),
  capacity: z.coerce.number().optional(),
  status: z.string().optional()
});

export default function DepartmentsList() {
  const { t, isRtl } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: depts, isLoading } = useListDepartments();
  const createDept = useCreateDepartment();
  const updateDept = useUpdateDepartment();
  const deleteDept = useDeleteDepartment();

  const form = useForm<z.infer<typeof deptSchema>>({
    resolver: zodResolver(deptSchema),
    defaultValues: {
      status: "active",
      capacity: 0
    }
  });

  const onSubmit = (values: z.infer<typeof deptSchema>) => {
    if (editingDept) {
      updateDept.mutate({ id: editingDept.id, data: values }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
          setCreateOpen(false);
          setEditingDept(null);
          toast({ title: t("departments.updated") });
        }
      });
    } else {
      createDept.mutate({ data: values }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
          setCreateOpen(false);
          form.reset();
          toast({ title: t("departments.created") });
        }
      });
    }
  };

  const onDelete = () => {
    if (!deleteId) return;
    deleteDept.mutate({ id: deleteId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
        setDeleteId(null);
        toast({ title: t("departments.deleted") });
      }
    });
  };

  const openEdit = (dept: any) => {
    setEditingDept(dept);
    form.reset({
      name: dept.name,
      nameAr: dept.nameAr || "",
      head: dept.head || "",
      location: dept.location || "",
      phone: dept.phone || "",
      capacity: dept.capacity || 0,
      status: dept.status
    });
    setCreateOpen(true);
  };

  const filtered = depts?.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase()) || 
    d.nameAr?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const total = depts?.length || 0;
  const active = depts?.filter(d => d.status === 'active').length || 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 end-0 bg-white/10 w-64 h-64 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("departments.title")}</h1>
            <p className="text-blue-100 mt-1">{t("departments.subtitle")}</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20">
              <div className="text-xs text-blue-100">{t("departments.totalDepts")}</div>
              <div className="text-2xl font-bold">{total}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20">
              <div className="text-xs text-blue-100">{t("departments.activeDepts")}</div>
              <div className="text-2xl font-bold">{active}</div>
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
            className="w-full ps-9 pe-4 py-2 bg-card border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-shadow shadow-sm"
          />
        </div>

        <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if(!open) { form.reset(); setEditingDept(null); }}}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto rounded-xl bg-blue-600 hover:bg-blue-700 shadow-sm"><Plus className="h-4 w-4 me-2"/> {t("departments.newDept")}</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-0 shadow-2xl rounded-2xl">
            <div className="px-6 py-4 border-b bg-slate-50 dark:bg-slate-900/50">
              <DialogTitle className="text-xl">{editingDept ? t("departments.editDept") : t("departments.newDept")}</DialogTitle>
            </div>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>{t("departments.name")}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="nameAr" render={({ field }) => (
                    <FormItem><FormLabel>{t("departments.nameAr")}</FormLabel><FormControl><Input {...field} dir="rtl" /></FormControl></FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="head" render={({ field }) => (
                  <FormItem><FormLabel>{t("departments.head")}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="location" render={({ field }) => (
                    <FormItem><FormLabel>{t("departments.location")}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem><FormLabel>{t("departments.phone")}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="capacity" render={({ field }) => (
                    <FormItem><FormLabel>{t("departments.capacity")}</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                  )} />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>{t("common.cancel")}</Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={createDept.isPending || updateDept.isPending}>{t("common.saveChanges")}</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground animate-pulse">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground flex flex-col items-center">
          <Building2 className="h-12 w-12 mb-3 opacity-20"/>
          {t("departments.noDepts")}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(dept => (
            <div key={dept.id} className="bg-card border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-foreground">{isRtl ? (dept.nameAr || dept.name) : dept.name}</h3>
                  <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${dept.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                    {t(`status.${dept.status}`)}
                  </span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(dept)} className="p-1.5 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => setDeleteId(dept.id)} className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-8 w-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                    <Users className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{t("departments.head")}</div>
                    <div className="font-medium text-foreground">{dept.head || '---'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-8 w-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <MapPin className="h-4 w-4 text-slate-500" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{t("departments.location")}</div>
                    <div className="font-medium text-foreground">{dept.location || '---'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-8 w-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <Phone className="h-4 w-4 text-slate-500" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{t("departments.phone")}</div>
                    <div className="font-medium text-foreground" dir="ltr">{dept.phone || '---'}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl border-0 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("departments.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("departments.deleteDesc")}</AlertDialogDescription>
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
