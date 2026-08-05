import { useState } from "react";
import { 
  useListStaff, 
  useCreateStaffMember, 
  useUpdateStaffMember, 
  useDeleteStaffMember,
  useListDepartments
} from "@workspace/api-client-react";
import { 
  Users2, 
  Search, 
  Plus, 
  MoreVertical, 
  Trash2,
  Pencil,
  Eye,
  EyeOff
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const staffSchema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  role: z.string().min(1, "Required"),
  departmentId: z.coerce.number().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  dateOfJoining: z.string().optional(),
  salary: z.coerce.number().optional(),
  status: z.string().optional()
});

export default function StaffList() {
  const { t, isRtl } = useTranslation();
  const locale = isRtl ? arLocale : enUS;
  const numLocale = isRtl ? 'ar-AE' : 'en-US';
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [revealedSalaries, setRevealedSalaries] = useState<Record<number, boolean>>({});

  const { data: staff, isLoading } = useListStaff();
  const { data: departments } = useListDepartments();
  const createStaff = useCreateStaffMember();
  const updateStaff = useUpdateStaffMember();
  const deleteStaff = useDeleteStaffMember();

  const form = useForm<z.infer<typeof staffSchema>>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      status: "active",
      dateOfJoining: format(new Date(), 'yyyy-MM-dd')
    }
  });

  const onSubmit = (values: z.infer<typeof staffSchema>) => {
    if (editingStaff) {
      updateStaff.mutate({ id: editingStaff.id, data: values }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
          setCreateOpen(false);
          setEditingStaff(null);
          toast({ title: t("staff.updated") });
        }
      });
    } else {
      createStaff.mutate({ data: values }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
          setCreateOpen(false);
          form.reset();
          toast({ title: t("staff.created") });
        }
      });
    }
  };

  const onDelete = () => {
    if (!deleteId) return;
    deleteStaff.mutate({ id: deleteId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
        setDeleteId(null);
        toast({ title: t("staff.deleted") });
      }
    });
  };

  const openEdit = (s: any) => {
    setEditingStaff(s);
    form.reset({
      firstName: s.firstName,
      lastName: s.lastName,
      role: s.role,
      departmentId: s.departmentId || undefined,
      phone: s.phone || "",
      email: s.email || "",
      dateOfJoining: s.dateOfJoining ? format(parseISO(s.dateOfJoining), 'yyyy-MM-dd') : "",
      salary: s.salary || 0,
      status: s.status
    });
    setCreateOpen(true);
  };

  const toggleSalary = (id: number) => {
    setRevealedSalaries(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filtered = staff?.filter(s => 
    `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase()) || 
    s.role.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const total = staff?.length || 0;
  const active = staff?.filter(s => s.status === 'active').length || 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 end-0 bg-white/10 w-64 h-64 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("staff.title")}</h1>
            <p className="text-purple-100 mt-1">{t("staff.subtitle")}</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20">
              <div className="text-xs text-purple-100">{t("staff.totalStaff")}</div>
              <div className="text-2xl font-bold">{total}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20">
              <div className="text-xs text-purple-100">{t("staff.activeStaff")}</div>
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
            className="w-full ps-9 pe-4 py-2 bg-card border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-shadow shadow-sm"
          />
        </div>

        <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if(!open) { form.reset(); setEditingStaff(null); }}}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto rounded-xl bg-purple-600 hover:bg-purple-700 shadow-sm"><Plus className="h-4 w-4 me-2"/> {t("staff.newStaff")}</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-0 shadow-2xl rounded-2xl">
            <div className="px-6 py-4 border-b bg-slate-50 dark:bg-slate-900/50">
              <DialogTitle className="text-xl">{editingStaff ? t("staff.editStaff") : t("staff.newStaff")}</DialogTitle>
            </div>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="firstName" render={({ field }) => (
                    <FormItem><FormLabel>{t("patients.firstName")}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="lastName" render={({ field }) => (
                    <FormItem><FormLabel>{t("patients.lastName")}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="role" render={({ field }) => (
                    <FormItem><FormLabel>{t("staff.role")}</FormLabel><FormControl><Input {...field} placeholder="Nurse, Receptionist..." /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="departmentId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("staff.department")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value?.toString()}>
                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                        <SelectContent>
                          {departments?.map(d => <SelectItem key={d.id} value={d.id.toString()}>{isRtl ? (d.nameAr || d.name) : d.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem><FormLabel>{t("staff.phone")}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>{t("staff.email")}</FormLabel><FormControl><Input type="email" {...field} /></FormControl></FormItem>
                  )} />
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <FormField control={form.control} name="dateOfJoining" render={({ field }) => (
                    <FormItem><FormLabel>{t("staff.dateOfJoining")}</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="salary" render={({ field }) => (
                    <FormItem><FormLabel>{t("staff.salary")}</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("common.status")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="active">{t("status.active")}</SelectItem>
                          <SelectItem value="on_leave">{t("status.on_leave")}</SelectItem>
                          <SelectItem value="inactive">{t("status.inactive")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>{t("common.cancel")}</Button>
                  <Button type="submit" className="bg-purple-600 hover:bg-purple-700" disabled={createStaff.isPending || updateStaff.isPending}>{t("common.saveChanges")}</Button>
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
                <th className="px-6 py-4">{t("staff.name")}</th>
                <th className="px-6 py-4">{t("staff.role")} & {t("staff.department")}</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">{t("staff.salary")}</th>
                <th className="px-6 py-4 text-end">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground animate-pulse">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground flex flex-col items-center"><Users2 className="h-8 w-8 mb-2 opacity-20"/>{t("staff.noStaff")}</td></tr>
              ) : filtered.map((s) => {
                return (
                  <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 flex items-center justify-center font-bold">
                          {s.firstName[0]}{s.lastName[0]}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{s.firstName} {s.lastName}</div>
                          <div className="text-[10px] mt-0.5 px-1.5 py-0.5 rounded-full inline-block font-medium tracking-wide uppercase
                            {s.status === 'active' ? 'bg-emerald-100 text-emerald-700' : s.status === 'on_leave' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}">
                            {t(`status.${s.status}`)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{s.role}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{s.departmentName || '---'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-muted-foreground" dir="ltr">{s.phone || '---'}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{s.email || '---'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {revealedSalaries[s.id] ? (
                          <span className="font-mono font-medium" dir="ltr">
                            {new Intl.NumberFormat(numLocale, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(s.salary || 0)}
                          </span>
                        ) : (
                          <span className="font-mono text-muted-foreground blur-[4px] select-none">$123,456</span>
                        )}
                        <button onClick={() => toggleSalary(s.id)} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                          {revealedSalaries[s.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 rounded-lg hover:bg-slate-100"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                          <DropdownMenuItem onClick={() => openEdit(s)} className="rounded-lg cursor-pointer">
                            <Pencil className="me-2 h-4 w-4 text-purple-500" /> {t("common.edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeleteId(s.id)} className="rounded-lg text-destructive focus:bg-destructive/10 cursor-pointer">
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
            <AlertDialogTitle>{t("staff.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("staff.deleteDesc")}</AlertDialogDescription>
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
