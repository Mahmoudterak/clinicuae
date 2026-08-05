import { useState } from "react";
import { 
  useListDoctors, 
  useCreateDoctor, 
  useUpdateDoctor, 
  useDeleteDoctor,
  getListDoctorsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Plus, 
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  Stethoscope,
  Mail,
  Phone
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslation } from "@/i18n/context";

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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const doctorSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  specialty: z.string().min(1, "Specialty is required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  department: z.string().optional(),
  status: z.string().default("active"),
  bio: z.string().optional(),
});

type DoctorFormValues = z.infer<typeof doctorSchema>;

export default function DoctorsList() {
  const { data: doctors, isLoading } = useListDoctors();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const createDoctor = useCreateDoctor();
  const updateDoctor = useUpdateDoctor();
  const deleteDoctor = useDeleteDoctor();

  const form = useForm<DoctorFormValues>({
    resolver: zodResolver(doctorSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      specialty: "",
      phone: "",
      email: "",
      department: "",
      status: "active",
      bio: "",
    }
  });

  const onSubmit = (data: DoctorFormValues) => {
    if (editingId) {
      updateDoctor.mutate(
        { id: editingId, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListDoctorsQueryKey() });
            setIsCreateOpen(false);
            setEditingId(null);
            form.reset();
            toast({ title: t("doctors.updated") });
          }
        }
      );
    } else {
      createDoctor.mutate(
        { data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListDoctorsQueryKey() });
            setIsCreateOpen(false);
            form.reset();
            toast({ title: t("doctors.created") });
          }
        }
      );
    }
  };

  const handleEdit = (doctor: any) => {
    form.reset({
      firstName: doctor.firstName,
      lastName: doctor.lastName,
      specialty: doctor.specialty,
      phone: doctor.phone || "",
      email: doctor.email || "",
      department: doctor.department || "",
      status: doctor.status || "active",
      bio: doctor.bio || "",
    });
    setEditingId(doctor.id);
    setIsCreateOpen(true);
  };

  const handleDelete = () => {
    if (!deletingId) return;
    deleteDoctor.mutate(
      { id: deletingId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListDoctorsQueryKey() });
          setDeletingId(null);
          toast({ title: t("doctors.deleted") });
        }
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("doctors.title")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("doctors.subtitle")}</p>
        </div>
        
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
              {t("doctors.addDoctor")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? t("doctors.editDoctor") : t("doctors.addDoctor")}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("patients.firstName")}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("patients.lastName")}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="specialty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("doctors.specialty")}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("doctors.department")}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("patients.phone")}</FormLabel>
                        <FormControl>
                          <Input dir="ltr" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("patients.email")}</FormLabel>
                        <FormControl>
                          <Input type="email" dir="ltr" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

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
                          <SelectItem value="active">{t("status.active")}</SelectItem>
                          <SelectItem value="on_leave">{t("status.on_leave")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("doctors.bio")}</FormLabel>
                      <FormControl>
                        <Textarea 
                          className="resize-none"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter className="pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsCreateOpen(false)}
                    disabled={createDoctor.isPending || updateDoctor.isPending}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button 
                    type="submit"
                    disabled={createDoctor.isPending || updateDoctor.isPending}
                  >
                    {(createDoctor.isPending || updateDoctor.isPending) && (
                      <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    )}
                    {editingId ? t("common.saveChanges") : t("doctors.addDoctor")}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : doctors?.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-xl border">
          <p className="text-muted-foreground">{t("doctors.noDoctors")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {doctors?.map((doctor) => (
            <div key={doctor.id} className="bg-card border rounded-xl overflow-hidden shadow-sm hover-elevate transition-shadow group">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                    {doctor.firstName[0]}{doctor.lastName[0]}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 -me-2">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(doctor)}>
                        <Pencil className="me-2 h-4 w-4" /> {t("doctors.editDetails")}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive focus:text-destructive focus:bg-destructive/10"
                        onClick={() => setDeletingId(doctor.id)}
                      >
                        <Trash2 className="me-2 h-4 w-4" /> {t("doctors.remove")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <div>
                  <h3 className="font-bold text-lg text-foreground line-clamp-1">Dr. {doctor.firstName} {doctor.lastName}</h3>
                  <div className="flex items-center gap-1.5 text-sm text-primary font-medium mt-1">
                    <Stethoscope className="h-3.5 w-3.5" />
                    {doctor.specialty}
                  </div>
                  {doctor.department && (
                    <p className="text-xs text-muted-foreground mt-1.5">{doctor.department}</p>
                  )}
                </div>

                <div className="mt-6 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4 shrink-0" />
                    <span className="truncate" dir="ltr">{doctor.phone || t("common.notApplicable")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4 shrink-0" />
                    <span className="truncate" dir="ltr">{doctor.email || t("common.notApplicable")}</span>
                  </div>
                </div>
              </div>
              <div className="px-6 py-3 bg-muted/30 border-t flex justify-between items-center">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  doctor.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                }`}>
                  {t(`status.${doctor.status}`)}
                </span>
                <span className="text-xs text-muted-foreground font-mono">ID: DR-{doctor.id}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("doctors.removeTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("doctors.removeDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteDoctor.isPending}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteDoctor.isPending}
            >
              {deleteDoctor.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("doctors.removeBtn")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
