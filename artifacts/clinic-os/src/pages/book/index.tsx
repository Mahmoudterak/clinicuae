import { useState, useMemo } from "react";
import { usePublicDoctors, useBookedSlots, useCreatePublicBooking } from "@/hooks/use-bookings";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { format, addDays, isBefore, startOfToday, parseISO } from "date-fns";
import { Calendar, Clock, User, Phone, Mail, ChevronRight, ChevronLeft, CheckCircle2, Stethoscope, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Standalone QueryClient for the public page (no auth context)
const publicQC = new QueryClient();

const TIME_SLOTS = [
  "08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30",
  "12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30",
  "16:00","16:30","17:00","17:30",
];

// Generate next 30 days excluding Fridays (day 5)
function getAvailableDates() {
  const dates: string[] = [];
  let d = addDays(startOfToday(), 1);
  while (dates.length < 30) {
    if (d.getDay() !== 5) dates.push(format(d, "yyyy-MM-dd"));
    d = addDays(d, 1);
  }
  return dates;
}

type Step = "doctor" | "datetime" | "info" | "confirm" | "done";

function BookingFlow() {
  const { data: doctors, isLoading: loadingDocs } = usePublicDoctors();
  const createBooking = useCreatePublicBooking();

  const [step, setStep] = useState<Step>("doctor");
  const [doctorId, setDoctorId] = useState<number | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", email: "", age: "", gender: "", reason: "", notes: "" });
  const [lang, setLang] = useState<"ar"|"en">("ar");
  const isRtl = lang === "ar";

  const selectedDoctor = doctors?.find(d => d.id === doctorId);
  const availableDates = useMemo(() => getAvailableDates(), []);
  const { data: bookedSlots } = useBookedSlots(doctorId, date);

  const setF = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async () => {
    try {
      await createBooking.mutateAsync({
        patientName: form.name,
        patientPhone: form.phone,
        patientEmail: form.email || undefined,
        patientAge: form.age ? Number(form.age) : undefined,
        patientGender: form.gender || undefined,
        doctorId: doctorId ?? undefined,
        preferredDate: date,
        preferredTime: time,
        reason: form.reason,
        notes: form.notes || undefined,
      });
      setStep("done");
    } catch { /* handled below */ }
  };

  const T = {
    title:         isRtl ? "احجز موعدك" : "Book Your Appointment",
    subtitle:      isRtl ? "اختر الطبيب والموعد المناسب لك" : "Choose your doctor and preferred time",
    selectDoctor:  isRtl ? "اختر الطبيب" : "Select Doctor",
    selectDate:    isRtl ? "اختر التاريخ والوقت" : "Choose Date & Time",
    yourInfo:      isRtl ? "بياناتك" : "Your Information",
    confirm:       isRtl ? "تأكيد الحجز" : "Confirm Booking",
    done:          isRtl ? "تم الحجز! ✓" : "Booking Confirmed! ✓",
    doneMsg:       isRtl ? "تم استلام طلب حجزك. سنتواصل معك لتأكيد الموعد." : "Your booking request has been received. We'll contact you to confirm.",
    next:          isRtl ? "التالي" : "Next",
    back:          isRtl ? "رجوع" : "Back",
    submit:        isRtl ? "تأكيد الحجز" : "Confirm Booking",
    name:          isRtl ? "الاسم الكامل" : "Full Name",
    phone:         isRtl ? "رقم الهاتف" : "Phone Number",
    email:         isRtl ? "البريد الإلكتروني (اختياري)" : "Email (optional)",
    age:           isRtl ? "العمر" : "Age",
    gender:        isRtl ? "الجنس" : "Gender",
    reason:        isRtl ? "سبب الزيارة" : "Reason for Visit",
    notes:         isRtl ? "ملاحظات إضافية (اختياري)" : "Additional Notes (optional)",
    male:          isRtl ? "ذكر" : "Male",
    female:        isRtl ? "أنثى" : "Female",
    specialty:     isRtl ? "التخصص" : "Specialty",
    available:     isRtl ? "متاح" : "Available",
    booked:        isRtl ? "محجوز" : "Booked",
    newBooking:    isRtl ? "حجز جديد" : "New Booking",
  };

  const steps: { id: Step; label: string }[] = [
    { id: "doctor",   label: isRtl ? "الطبيب" : "Doctor" },
    { id: "datetime", label: isRtl ? "الموعد" : "Date & Time" },
    { id: "info",     label: isRtl ? "البيانات" : "Your Info" },
    { id: "confirm",  label: isRtl ? "تأكيد" : "Confirm" },
  ];
  const stepIndex = steps.findIndex(s => s.id === step);

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className={`min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col`}>
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <Calendar className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-lg leading-none">{isRtl ? "الحجز الإلكتروني" : "Online Booking"}</p>
            <p className="text-xs text-muted-foreground">Clinic OS</p>
          </div>
        </div>
        <button onClick={() => setLang(l => l === "ar" ? "en" : "ar")}
          className="text-sm font-bold px-3 py-1.5 rounded-full border hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          {isRtl ? "EN" : "ع"}
        </button>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 space-y-6">
        {step !== "done" && (
          <>
            <div className="text-center">
              <h1 className="text-2xl font-bold">{T.title}</h1>
              <p className="text-muted-foreground text-sm mt-1">{T.subtitle}</p>
            </div>

            {/* Progress bar */}
            <div className="flex items-center gap-2">
              {steps.map((s, i) => (
                <div key={s.id} className="flex items-center flex-1 gap-2">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                    i < stepIndex ? "bg-primary text-primary-foreground" :
                    i === stepIndex ? "bg-primary text-primary-foreground ring-4 ring-primary/20" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {i < stepIndex ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block ${i === stepIndex ? "text-primary" : "text-muted-foreground"}`}>{s.label}</span>
                  {i < steps.length - 1 && <div className={`flex-1 h-px ${i < stepIndex ? "bg-primary" : "bg-border"}`} />}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Step: Doctor ── */}
        {step === "doctor" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">{T.selectDoctor}</h2>
            {loadingDocs ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-2xl animate-pulse" />)}</div>
            ) : doctors?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Stethoscope className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p>{isRtl ? "لا يوجد أطباء متاحون حالياً." : "No doctors available right now."}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {doctors?.map(d => (
                  <button key={d.id} onClick={() => { setDoctorId(d.id); setStep("datetime"); }}
                    className={`w-full text-start bg-card border rounded-2xl p-5 hover:border-primary hover:shadow-md transition-all group ${doctorId === d.id ? "border-primary ring-2 ring-primary/20" : ""}`}>
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold shrink-0">
                        {d.firstName[0]}{d.lastName[0]}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">{isRtl ? "د. " : "Dr. "}{d.firstName} {d.lastName}</p>
                        <p className="text-sm text-muted-foreground">{d.specialty}</p>
                      </div>
                      <ChevronRight className={`h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors ${isRtl ? "rotate-180" : ""}`} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Step: Date & Time ── */}
        {step === "datetime" && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold">{T.selectDate}</h2>
            {selectedDoctor && (
              <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-2xl p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {selectedDoctor.firstName[0]}{selectedDoctor.lastName[0]}
                </div>
                <div>
                  <p className="font-semibold">{isRtl ? "د. " : "Dr. "}{selectedDoctor.firstName} {selectedDoctor.lastName}</p>
                  <p className="text-xs text-muted-foreground">{selectedDoctor.specialty}</p>
                </div>
              </div>
            )}

            <div>
              <Label className="mb-2 block">{isRtl ? "اختر التاريخ" : "Select Date"}</Label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {availableDates.slice(0, 15).map(d => {
                  const parsed = parseISO(d);
                  return (
                    <button key={d} onClick={() => { setDate(d); setTime(""); }}
                      className={`p-2.5 rounded-xl border text-center transition-all text-sm ${date === d ? "bg-primary text-primary-foreground border-primary shadow-md" : "bg-card hover:border-primary/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"}`}>
                      <p className="font-bold text-base">{format(parsed, "d")}</p>
                      <p className="text-xs opacity-70">{format(parsed, "MMM")}</p>
                      <p className="text-xs opacity-70">{isRtl ? ["أح","إث","ث","أر","خ","ج","س"][parsed.getDay()] : format(parsed, "EEE")}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {date && (
              <div>
                <Label className="mb-2 block">{isRtl ? "اختر الوقت" : "Select Time"}</Label>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                  {TIME_SLOTS.map(slot => {
                    const isBooked = bookedSlots?.includes(slot);
                    return (
                      <button key={slot} onClick={() => !isBooked && setTime(slot)} disabled={!!isBooked}
                        className={`py-2 rounded-xl border text-sm font-medium transition-all ${
                          isBooked ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50" :
                          time === slot ? "bg-primary text-primary-foreground border-primary shadow-md" :
                          "bg-card hover:border-primary/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                        }`}>
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1 gap-2" onClick={() => setStep("doctor")}>
                <ArrowLeft className={`h-4 w-4 ${isRtl ? "rotate-180" : ""}`} />{T.back}
              </Button>
              <Button className="flex-1" onClick={() => setStep("info")} disabled={!date || !time}>{T.next}</Button>
            </div>
          </div>
        )}

        {/* ── Step: Patient Info ── */}
        {step === "info" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">{T.yourInfo}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label>{T.name} *</Label>
                <Input value={form.name} onChange={setF("name")} placeholder={isRtl ? "محمد أحمد" : "John Smith"} />
              </div>
              <div className="space-y-1.5">
                <Label>{T.phone} *</Label>
                <Input value={form.phone} onChange={setF("phone")} placeholder="+971 50 000 0000" dir="ltr" />
              </div>
              <div className="space-y-1.5">
                <Label>{T.email}</Label>
                <Input value={form.email} onChange={setF("email")} placeholder="email@example.com" dir="ltr" type="email" />
              </div>
              <div className="space-y-1.5">
                <Label>{T.age}</Label>
                <Input value={form.age} onChange={setF("age")} type="number" min={0} max={150} placeholder="30" />
              </div>
              <div className="space-y-1.5">
                <Label>{T.gender}</Label>
                <Select value={form.gender} onValueChange={v => setForm(p => ({ ...p, gender: v }))}>
                  <SelectTrigger><SelectValue placeholder={isRtl ? "اختر..." : "Select..."} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">{T.male}</SelectItem>
                    <SelectItem value="female">{T.female}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label>{T.reason} *</Label>
                <Textarea value={form.reason} onChange={setF("reason")} rows={3} placeholder={isRtl ? "اكتب سبب زيارتك..." : "Describe your reason for visit..."} className="resize-none" />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label>{T.notes}</Label>
                <Textarea value={form.notes} onChange={setF("notes")} rows={2} className="resize-none" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1 gap-2" onClick={() => setStep("datetime")}>
                <ArrowLeft className={`h-4 w-4 ${isRtl ? "rotate-180" : ""}`} />{T.back}
              </Button>
              <Button className="flex-1" onClick={() => setStep("confirm")} disabled={!form.name || !form.phone || !form.reason}>{T.next}</Button>
            </div>
          </div>
        )}

        {/* ── Step: Confirm ── */}
        {step === "confirm" && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold">{T.confirm}</h2>
            <div className="bg-card border rounded-2xl divide-y overflow-hidden">
              {[
                { icon: Stethoscope, label: isRtl ? "الطبيب" : "Doctor", value: selectedDoctor ? `${isRtl ? "د. " : "Dr. "}${selectedDoctor.firstName} ${selectedDoctor.lastName} — ${selectedDoctor.specialty}` : "—" },
                { icon: Calendar,    label: isRtl ? "التاريخ" : "Date",   value: date },
                { icon: Clock,       label: isRtl ? "الوقت" : "Time",     value: time },
                { icon: User,        label: isRtl ? "الاسم" : "Name",     value: form.name },
                { icon: Phone,       label: isRtl ? "الهاتف" : "Phone",   value: form.phone },
                { icon: Mail,        label: isRtl ? "السبب" : "Reason",   value: form.reason },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-sm font-medium">{value}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 gap-2" onClick={() => setStep("info")}>
                <ArrowLeft className={`h-4 w-4 ${isRtl ? "rotate-180" : ""}`} />{T.back}
              </Button>
              <Button className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700" onClick={handleSubmit} disabled={createBooking.isPending}>
                {createBooking.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {T.submit}
              </Button>
            </div>
          </div>
        )}

        {/* ── Done ── */}
        {step === "done" && (
          <div className="text-center py-12 space-y-6">
            <div className="h-24 w-24 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-12 w-12 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{T.done}</h2>
              <p className="text-muted-foreground mt-2 max-w-sm mx-auto">{T.doneMsg}</p>
            </div>
            <div className="bg-card border rounded-2xl p-5 max-w-sm mx-auto text-start">
              <p className="text-sm text-muted-foreground mb-3">{isRtl ? "ملخص الحجز" : "Booking Summary"}</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">{isRtl ? "الطبيب" : "Doctor"}</span><span className="font-medium">{isRtl ? "د. " : "Dr. "}{selectedDoctor?.firstName} {selectedDoctor?.lastName}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{isRtl ? "التاريخ" : "Date"}</span><span className="font-medium">{date}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{isRtl ? "الوقت" : "Time"}</span><span className="font-medium">{time}</span></div>
              </div>
            </div>
            <Button onClick={() => { setStep("doctor"); setDoctorId(null); setDate(""); setTime(""); setForm({ name: "", phone: "", email: "", age: "", gender: "", reason: "", notes: "" }); }} className="gap-2">
              {T.newBooking}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

export default function PublicBookingPage() {
  return (
    <QueryClientProvider client={publicQC}>
      <BookingFlow />
    </QueryClientProvider>
  );
}
