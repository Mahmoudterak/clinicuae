import { useState } from "react";
import { useTranslation } from "@/i18n/context";
import { useListBookings, useUpdateBooking, useDeleteBooking, type OnlineBooking } from "@/hooks/use-bookings";
import { useToast } from "@/hooks/use-toast";
import {
  CalendarCheck, Clock, Phone, Mail, User, Stethoscope,
  CheckCircle2, XCircle, Loader2, Trash2, MessageSquare,
  ChevronRight, Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format, parseISO } from "date-fns";

const STATUS_MAP: Record<string, { label: string; labelAr: string; color: string; dot: string }> = {
  pending:   { label: "Pending",   labelAr: "قيد الانتظار", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",     dot: "bg-amber-500" },
  confirmed: { label: "Confirmed", labelAr: "مؤكد",         color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400", dot: "bg-emerald-500" },
  rejected:  { label: "Rejected",  labelAr: "مرفوض",        color: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",               dot: "bg-red-500" },
  completed: { label: "Completed", labelAr: "مكتمل",        color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",          dot: "bg-slate-400" },
};

function BookingCard({ booking, onAction }: { booking: OnlineBooking; onAction: (b: OnlineBooking) => void }) {
  const { isRtl } = useTranslation();
  const st = STATUS_MAP[booking.status] ?? STATUS_MAP.pending;

  return (
    <div className="bg-card border rounded-2xl p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-4">
        <div className="h-11 w-11 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0 text-indigo-700 font-bold text-sm">
          {booking.patientName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold">{booking.patientName}</p>
            <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${st.color}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
              {isRtl ? st.labelAr : st.label}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-1.5 flex-wrap text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /><span dir="ltr">{booking.patientPhone}</span></span>
            {booking.patientEmail && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{booking.patientEmail}</span>}
          </div>
        </div>
        <Button variant="ghost" size="sm" className="rounded-xl shrink-0 gap-1" onClick={() => onAction(booking)}>
          {isRtl ? "تفاصيل" : "Details"}
          <ChevronRight className={`h-4 w-4 ${isRtl ? "rotate-180" : ""}`} />
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-2.5">
          <CalendarCheck className="h-4 w-4 text-indigo-500 shrink-0" />
          <span dir="ltr">{booking.preferredDate}</span>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-2.5">
          <Clock className="h-4 w-4 text-violet-500 shrink-0" />
          <span>{booking.preferredTime}</span>
        </div>
        {booking.doctorName && (
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-2.5">
            <Stethoscope className="h-4 w-4 text-teal-500 shrink-0" />
            <span className="truncate">{booking.doctorName}</span>
          </div>
        )}
      </div>

      <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{booking.reason}</p>
    </div>
  );
}

function BookingDetail({ booking, onClose }: { booking: OnlineBooking; onClose: () => void }) {
  const { isRtl } = useTranslation();
  const { toast } = useToast();
  const update = useUpdateBooking();
  const [notes, setNotes] = useState(booking.adminNotes ?? "");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const del = useDeleteBooking();

  const act = async (status: string) => {
    try {
      await update.mutateAsync({ id: booking.id, status, adminNotes: notes || undefined });
      toast({ title: isRtl ? "تم التحديث" : "Updated" });
      onClose();
    } catch { toast({ title: isRtl ? "خطأ" : "Error", variant: "destructive" }); }
  };

  const st = STATUS_MAP[booking.status] ?? STATUS_MAP.pending;

  return (
    <>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-primary" />
            {isRtl ? "تفاصيل الحجز" : "Booking Details"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center font-bold text-indigo-700">
              {booking.patientName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-lg">{booking.patientName}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>{isRtl ? st.labelAr : st.label}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { icon: Phone, label: isRtl ? "الهاتف" : "Phone", value: booking.patientPhone },
              { icon: Mail, label: isRtl ? "البريد" : "Email", value: booking.patientEmail || "—" },
              { icon: User, label: isRtl ? "العمر" : "Age", value: booking.patientAge ? `${booking.patientAge} ${isRtl ? "سنة" : "yrs"}` : "—" },
              { icon: User, label: isRtl ? "الجنس" : "Gender", value: booking.patientGender || "—" },
              { icon: CalendarCheck, label: isRtl ? "التاريخ" : "Date", value: booking.preferredDate },
              { icon: Clock, label: isRtl ? "الوقت" : "Time", value: booking.preferredTime },
              { icon: Stethoscope, label: isRtl ? "الطبيب" : "Doctor", value: booking.doctorName || "—" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-muted/40 rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Icon className="h-3 w-3" />{label}</p>
                <p className="font-medium" dir={label === "Phone" || label === "الهاتف" ? "ltr" : undefined}>{value}</p>
              </div>
            ))}
          </div>

          <div className="bg-muted/40 rounded-xl p-3">
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><MessageSquare className="h-3 w-3" />{isRtl ? "سبب الزيارة" : "Reason"}</p>
            <p className="text-sm">{booking.reason}</p>
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-medium">{isRtl ? "ملاحظات الإدارة" : "Admin Notes"}</p>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder={isRtl ? "ملاحظات داخلية..." : "Internal notes..."} className="resize-none text-sm" />
          </div>
        </div>
        <DialogFooter className="gap-2 flex-wrap sm:flex-nowrap">
          <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/5" onClick={() => setDeleteConfirm(true)}>
            <Trash2 className="h-4 w-4" />
          </Button>
          {booking.status === "pending" && (
            <>
              <Button variant="outline" className="flex-1 gap-2 border-red-200 text-red-700 hover:bg-red-50" onClick={() => act("rejected")} disabled={update.isPending}>
                <XCircle className="h-4 w-4" />{isRtl ? "رفض" : "Reject"}
              </Button>
              <Button className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700" onClick={() => act("confirmed")} disabled={update.isPending}>
                {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {isRtl ? "تأكيد" : "Confirm"}
              </Button>
            </>
          )}
          {booking.status === "confirmed" && (
            <Button className="flex-1 gap-2" onClick={() => act("completed")} disabled={update.isPending}>
              <CheckCircle2 className="h-4 w-4" />{isRtl ? "اكتمل" : "Mark Complete"}
            </Button>
          )}
          {(booking.status === "rejected" || booking.status === "completed") && (
            <Button variant="outline" className="flex-1" onClick={() => act("pending")} disabled={update.isPending}>
              {isRtl ? "إعادة للانتظار" : "Reset to Pending"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>

      <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isRtl ? "حذف الحجز؟" : "Delete Booking?"}</AlertDialogTitle>
            <AlertDialogDescription>{isRtl ? "لا يمكن التراجع." : "This cannot be undone."}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRtl ? "إلغاء" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={async () => { await del.mutateAsync(booking.id); setDeleteConfirm(false); onClose(); }}>
              {isRtl ? "حذف" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function BookingsPage() {
  const { isRtl } = useTranslation();
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<OnlineBooking | null>(null);
  const { data: bookings, isLoading } = useListBookings(statusFilter === "all" ? undefined : statusFilter);

  const counts = {
    all: bookings?.length ?? 0,
    pending: bookings?.filter(b => b.status === "pending").length ?? 0,
    confirmed: bookings?.filter(b => b.status === "confirmed").length ?? 0,
    rejected: bookings?.filter(b => b.status === "rejected").length ?? 0,
    completed: bookings?.filter(b => b.status === "completed").length ?? 0,
  };

  const FILTERS = [
    { key: "all",       label: "All",       labelAr: "الكل" },
    { key: "pending",   label: "Pending",   labelAr: "انتظار" },
    { key: "confirmed", label: "Confirmed", labelAr: "مؤكدة" },
    { key: "rejected",  label: "Rejected",  labelAr: "مرفوضة" },
    { key: "completed", label: "Completed", labelAr: "مكتملة" },
  ];

  return (
    <div className="space-y-8 pb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{isRtl ? "الحجوزات الإلكترونية" : "Online Bookings"}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {isRtl ? "إدارة الحجوزات القادمة من صفحة الحجز الإلكتروني." : "Manage bookings from the public booking page."}
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: isRtl ? "انتظار" : "Pending",   value: counts.pending,   color: "from-amber-400 to-orange-500" },
          { label: isRtl ? "مؤكدة" : "Confirmed",  value: counts.confirmed, color: "from-emerald-500 to-green-600" },
          { label: isRtl ? "مكتملة" : "Completed", value: counts.completed, color: "from-indigo-500 to-violet-600" },
          { label: isRtl ? "مرفوضة" : "Rejected",  value: counts.rejected,  color: "from-red-500 to-rose-600" },
        ].map((s, i) => (
          <div key={i} className={`bg-gradient-to-br ${s.color} rounded-2xl p-5 text-white shadow-sm`}>
            <p className="text-3xl font-bold">{s.value}</p>
            <p className="text-sm mt-1 text-white/80">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setStatusFilter(f.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${statusFilter === f.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
            <Filter className="h-3 w-3" />
            {isRtl ? f.labelAr : f.label}
            <span className="opacity-70">{counts[f.key as keyof typeof counts]}</span>
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-36 bg-muted rounded-2xl animate-pulse" />)}</div>
      ) : !bookings?.length ? (
        <div className="text-center py-20 text-muted-foreground">
          <CalendarCheck className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">{isRtl ? "لا توجد حجوزات" : "No bookings yet"}</p>
          <p className="text-sm mt-1">{isRtl ? "ستظهر الحجوزات القادمة من صفحة الحجز هنا." : "Bookings from the public page will appear here."}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map(b => <BookingCard key={b.id} booking={b} onAction={setSelected} />)}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        {selected && <BookingDetail booking={selected} onClose={() => setSelected(null)} />}
      </Dialog>
    </div>
  );
}
