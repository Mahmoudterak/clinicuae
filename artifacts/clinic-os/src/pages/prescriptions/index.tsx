import { useState } from "react";
import { 
  useListPrescriptions, 
  useCreatePrescription, 
  useDeletePrescription,
  getListPrescriptionsQueryKey,
  useListPatients,
  useListDoctors
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Plus, 
  Trash2,
  Loader2,
  Pill,
  Clock
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

const prescriptionSchema = z.object({
  patientId: z.coerce.number().min(1, "Patient is required"),
  doctorId: z.coerce.number().min(1, "Doctor is required"),
  medication: z.string().min(1, "Medication is required"),
  dosage: z.string().min(1, "Dosage is required"),
  frequency: z.string().min(1, "Frequency is required"),
  durationDays: z.coerce.number().optional(),
  instructions: z.string().optional(),
});

type PrescriptionFormValues = z.infer<typeof prescriptionSchema>;

export default function PrescriptionsList() {
  const [patientFilter, setPatientFilter] = useState<string>("all");
  const { data: prescriptions, isLoading } = useListPrescriptions(
    patientFilter !== "all" ? { patientId: Number(patientFilter) } : {}
  );
  const { data: patients } = useListPatients();
  const { data: doctors } = useListDoctors();
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const createPrescription = useCreatePrescription();
  const deletePrescription = useDeletePrescription();

  const form = useForm<PrescriptionFormValues>({
    resolver: zodResolver(prescriptionSchema),
    defaultValues: {
      patientId: 0,
      doctorId: 0,
      medication: "",
      dosage: "",
      frequency: "",
      durationDays: 7,
      instructions: "",
    }
  });

  const onSubmit = (data: PrescriptionFormValues) => {
    createPrescription.mutate(
      { data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPrescriptionsQueryKey() });
          setIsCreateOpen(false);
          form.reset();
          toast({ title: "Prescription issued successfully" });
        }
      }
    );
  };

  const handleDelete = () => {
    if (!deletingId) return;
    deletePrescription.mutate(
      { id: deletingId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPrescriptionsQueryKey() });
          setDeletingId(null);
          toast({ title: "Prescription deleted" });
        }
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Prescriptions</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage patient medications and dosages.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={patientFilter} onValueChange={setPatientFilter}>
            <SelectTrigger className="w-[200px] bg-card">
              <SelectValue placeholder="All Patients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Patients</SelectItem>
              {patients?.map(p => (
                <SelectItem key={p.id} value={String(p.id)}>{p.firstName} {p.lastName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Dialog open={isCreateOpen} onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (!open) {
              form.reset();
            }
          }}>
            <DialogTrigger asChild>
              <Button className="shrink-0 gap-1.5">
                <Plus className="h-4 w-4" />
                Issue Rx
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Issue New Prescription</DialogTitle>
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

                  <FormField
                    control={form.control}
                    name="doctorId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prescribing Doctor</FormLabel>
                        <Select 
                          onValueChange={(v) => field.onChange(Number(v))} 
                          value={field.value ? String(field.value) : undefined}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select doctor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {doctors?.map(d => (
                              <SelectItem key={d.id} value={String(d.id)}>
                                Dr. {d.firstName} {d.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="medication"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Medication Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Amoxicillin 500mg" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="dosage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dosage</FormLabel>
                          <FormControl>
                            <Input placeholder="1 tablet" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="frequency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Frequency</FormLabel>
                          <FormControl>
                            <Input placeholder="Twice a day" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="durationDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (Days)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="instructions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Special Instructions</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Take with food..." className="resize-none" {...field} />
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
                      disabled={createPrescription.isPending}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      disabled={createPrescription.isPending}
                    >
                      {createPrescription.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Issue Prescription
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : prescriptions?.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-card border rounded-xl">
            <p className="text-muted-foreground">No prescriptions found.</p>
          </div>
        ) : (
          prescriptions?.map((rx) => (
            <div key={rx.id} className="bg-card border border-primary/20 rounded-xl overflow-hidden shadow-sm hover-elevate transition-shadow">
              <div className="p-6 relative">
                <div className="absolute top-6 right-6">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setDeletingId(rx.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex items-start gap-4 mb-4 pr-10">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Pill className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-foreground leading-tight">{rx.medication}</h3>
                    <p className="text-sm font-medium text-muted-foreground">{rx.patientName}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-sm bg-muted/30 p-3 rounded-lg border">
                    <div>
                      <span className="block text-xs text-muted-foreground mb-0.5">Dosage</span>
                      <span className="font-medium text-foreground">{rx.dosage}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-muted-foreground mb-0.5">Frequency</span>
                      <span className="font-medium text-foreground">{rx.frequency}</span>
                    </div>
                  </div>

                  {rx.instructions && (
                    <div className="text-sm">
                      <span className="font-medium">Instructions:</span>
                      <p className="text-muted-foreground mt-0.5">{rx.instructions}</p>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-4 pt-4 border-t">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {rx.durationDays ? `${rx.durationDays} days supply` : 'Ongoing'}
                    </div>
                    <div>
                      Rx by Dr. {rx.doctorName}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Prescription?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the prescription record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePrescription.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletePrescription.isPending}
            >
              {deletePrescription.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
