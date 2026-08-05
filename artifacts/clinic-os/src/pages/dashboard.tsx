import { 
  useGetDashboardSummary, 
  useGetRecentActivity, 
  useGetAppointmentsByDay, 
  useGetRevenueByMonth,
  useListAppointments,
  useListInvoices,
  useListDoctors
} from "@workspace/api-client-react";
import { 
  Users, 
  Stethoscope, 
  Calendar as CalendarIcon, 
  DollarSign, 
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  FileText,
  ChevronLeft,
  ChevronRight,
  Bot,
  AlertCircle,
  Plus,
  ArrowRight,
  Pill
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from "recharts";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, isSameDay } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import { useTranslation } from "@/i18n/context";
import { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";

import { useAuth } from "@/contexts/auth-context";

// CountUp Component
const CountUp = ({ 
  end, 
  duration = 1500, 
  isCurrency = false,
  locale = 'en-US'
}: { 
  end: number; 
  duration?: number;
  isCurrency?: boolean;
  locale?: string;
}) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const updateCount = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      
      if (progress < duration) {
        const nextCount = Math.min(end, (progress / duration) * end);
        setCount(nextCount);
        animationFrame = requestAnimationFrame(updateCount);
      } else {
        setCount(end);
      }
    };

    animationFrame = requestAnimationFrame(updateCount);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  if (isCurrency) {
    return <>{new Intl.NumberFormat(locale, { style: 'currency', currency: 'AED', maximumFractionDigits: 0 }).format(count)}</>;
  }
  return <>{new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(count)}</>;
};


export default function Dashboard() {
  const { role, doctorId } = useAuth();
  
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: activity, isLoading: loadingActivity } = useGetRecentActivity();
  const { data: appointmentsByDay, isLoading: loadingAppts } = useGetAppointmentsByDay();
  const { data: revenueByMonth, isLoading: loadingRevenue } = useGetRevenueByMonth();
  const { data: appointments } = useListAppointments(role === 'doctor' && doctorId ? { doctorId } : undefined);
  const { data: invoices } = useListInvoices(role === 'doctor' && doctorId ? { doctorId } : undefined);
  const { data: doctors } = useListDoctors();
  
  const { t, isRtl, lang } = useTranslation();
  const locale = isRtl ? arLocale : enUS;
  const numLocale = isRtl ? 'ar-AE' : 'en-US';

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const daysInMonth = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth)
    });
  }, [currentMonth]);

  if (loadingSummary || loadingActivity || loadingAppts || loadingRevenue) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded-md mb-8"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-muted rounded-xl"></div>)}
        </div>
        <div className="h-[400px] bg-muted rounded-xl"></div>
      </div>
    );
  }

  const pendingPayments = invoices?.filter(i => i.status === 'pending' || i.status === 'overdue').reduce((acc, curr) => acc + curr.amount, 0) || 0;
  
  const statCards = [
    {
      title: t("dashboard.totalPatients"),
      value: summary?.totalPatients ?? 0,
      icon: Users,
      trend: "+12.5%",
      trendUp: true,
      gradient: "from-indigo-500 to-violet-500",
      shadow: "shadow-indigo-500/20"
    },
    {
      title: t("dashboard.appointmentsToday"),
      value: summary?.appointmentsToday ?? 0,
      icon: CalendarIcon,
      trend: "+5.2%",
      trendUp: true,
      gradient: "from-violet-500 to-fuchsia-500",
      shadow: "shadow-violet-500/20"
    },
    {
      title: t("dashboard.pendingPayments"),
      value: pendingPayments,
      icon: DollarSign,
      trend: "-2.4%",
      trendUp: false,
      isCurrency: true,
      gradient: "from-amber-400 to-orange-500",
      shadow: "shadow-amber-500/20"
    },
    {
      title: t("dashboard.monthlyRevenue"),
      value: summary?.revenueThisMonth ?? 0,
      icon: Activity,
      trend: "+18.2%",
      trendUp: true,
      isCurrency: true,
      gradient: "from-teal-400 to-emerald-500",
      shadow: "shadow-teal-500/20"
    }
  ];

  const todaysAppointments = appointments?.filter(a => isSameDay(parseISO(a.date), new Date())) || [];
  const selectedDateAppointments = appointments?.filter(a => isSameDay(parseISO(a.date), selectedDate)) || [];

  // AI Insights logic
  const busiestDoctorId = appointments?.reduce((acc: Record<string, number>, curr) => {
    acc[curr.doctorId] = (acc[curr.doctorId] || 0) + 1;
    return acc;
  }, {});
  const busiestDoc = busiestDoctorId ? Object.entries(busiestDoctorId).sort((a, b) => b[1] - a[1])[0] : null;
  
  let busiestDocName = null;
  if (busiestDoc && doctors) {
    const doc = doctors.find(d => d.id === Number(busiestDoc[0]));
    if (doc) busiestDocName = `Dr. ${doc.firstName} ${doc.lastName}`;
  }

  // ── Doctor-scoped dashboard ──────────────────────────────────────────
  if (role === 'doctor') {
    const myTodayAppts = appointments?.filter(a => isSameDay(parseISO(a.date), new Date())) || [];
    const myUpcoming  = appointments?.filter(a => !isSameDay(parseISO(a.date), new Date()) && new Date(a.date) > new Date()) || [];
    const myPending   = invoices?.filter(i => i.status === 'pending' || i.status === 'overdue') || [];
    const myPendingAmt = myPending.reduce((s, i) => s + i.amount, 0);
    const myPatientsSet = new Set(appointments?.map(a => a.patientId) || []);
    const fmtAED = (n: number) => new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 }).format(n);

    const docCards = [
      { label: isRtl ? 'مواعيد اليوم' : "Today's Appointments", value: myTodayAppts.length, gradient: 'from-indigo-500 to-violet-500', shadow: 'shadow-indigo-500/20', icon: CalendarIcon },
      { label: isRtl ? 'المواعيد القادمة' : 'Upcoming', value: myUpcoming.length, gradient: 'from-violet-500 to-fuchsia-500', shadow: 'shadow-violet-500/20', icon: Clock },
      { label: isRtl ? 'إجمالي مرضاي' : 'My Patients', value: myPatientsSet.size, gradient: 'from-sky-500 to-cyan-500', shadow: 'shadow-sky-500/20', icon: Users },
      { label: isRtl ? 'فواتير معلّقة' : 'Pending Invoices', value: myPendingAmt, isCurrency: true, gradient: 'from-amber-400 to-orange-500', shadow: 'shadow-amber-500/20', icon: DollarSign },
    ];

    return (
      <div className="space-y-8 pb-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{isRtl ? 'لوحة الطبيب' : 'Doctor Dashboard'}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{isRtl ? 'نظرة عامة على جدولك ومرضاك' : "Overview of your schedule and patients"}</p>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {docCards.map((c, i) => (
            <div key={i} className={`bg-gradient-to-br ${c.gradient} rounded-2xl p-6 text-white shadow-lg ${c.shadow} hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden group`}>
              <div className="absolute -end-8 -top-8 bg-white/10 w-32 h-32 rounded-full blur-2xl group-hover:bg-white/20 transition-all" />
              <div className="relative z-10">
                <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20">
                  <c.icon className="h-5 w-5 text-white" />
                </div>
                <p className="text-3xl font-bold mt-4 tracking-tight">
                  {c.isCurrency ? fmtAED(c.value) : <CountUp end={c.value} locale={numLocale} />}
                </p>
                <p className="text-sm font-medium text-white/80 mt-1">{c.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Calendar + today's schedule */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="bg-card border rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div>
                <h3 className="font-semibold">{t("dashboard.schedule")}</h3>
                <p className="text-xs text-muted-foreground">{t("dashboard.scheduleDesc")}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors">
                  <ChevronLeft className={`h-4 w-4 ${isRtl ? 'rotate-180' : ''}`} />
                </button>
                <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors">
                  <ChevronRight className={`h-4 w-4 ${isRtl ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>
            <div className="p-5">
              <div className="text-center font-medium text-sm mb-4 text-primary">{format(currentMonth, 'MMMM yyyy', { locale })}</div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground mb-2">
                {['S','M','T','W','T','F','S'].map((d, i) => <div key={i} className="font-medium">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: daysInMonth[0].getDay() }).map((_, i) => <div key={`pad-${i}`} />)}
                {daysInMonth.map(day => {
                  const dayAppts = appointments?.filter(a => isSameDay(parseISO(a.date), day));
                  const hasAppts = dayAppts && dayAppts.length > 0;
                  const isSelected = isSameDay(day, selectedDate);
                  const isTodayDay = isToday(day);
                  return (
                    <button key={day.toISOString()} onClick={() => setSelectedDate(day)}
                      className={`aspect-square rounded-full flex flex-col items-center justify-center text-sm relative transition-all
                        ${isSelected ? 'bg-primary text-primary-foreground font-semibold shadow-md' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground'}
                        ${isTodayDay && !isSelected ? 'text-primary font-bold' : ''}`}>
                      {format(day, 'd')}
                      {hasAppts && <span className={`absolute bottom-1 h-1 w-1 rounded-full ${isSelected ? 'bg-white' : 'bg-primary'}`} />}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-auto border-t bg-slate-50/50 dark:bg-slate-900/50 p-4">
              <div className="text-sm font-medium mb-3 flex items-center justify-between">
                <span>{format(selectedDate, 'MMM d, yyyy', { locale })}</span>
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{selectedDateAppointments.length} Appts</span>
              </div>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {selectedDateAppointments.length > 0 ? selectedDateAppointments.map(appt => (
                  <div key={appt.id} className="text-xs flex items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded border">
                    <span className="font-medium text-slate-500 w-12 shrink-0">{appt.time}</span>
                    <span className="font-medium truncate">{appt.patientName}</span>
                  </div>
                )) : (
                  <div className="text-xs text-muted-foreground text-center py-4">{t("appointments.noAppointments")}</div>
                )}
              </div>
            </div>
          </div>

          {/* Today's appointments detail */}
          <div className="lg:col-span-2 bg-card border rounded-2xl shadow-sm flex flex-col">
            <div className="p-5 border-b bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-primary" />
                {t("dashboard.todaysSchedule")}
              </h3>
              <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">{myTodayAppts.length} {isRtl ? 'موعد' : 'appointments'}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1 min-h-[280px]">
              {myTodayAppts.length > 0 ? myTodayAppts.map(appt => (
                <div key={appt.id} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl flex items-center gap-3 transition-colors border border-transparent hover:border-border">
                  <div className="h-9 w-9 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center shrink-0 text-xs font-bold text-indigo-600">
                    {appt.patientName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{appt.patientName}</p>
                    <p className="text-xs text-muted-foreground">{appt.reason}</p>
                  </div>
                  <div className="text-end shrink-0">
                    <p className="text-sm font-medium" dir="ltr">{appt.time}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      appt.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                      appt.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>{t(`status.${appt.status}`)}</span>
                  </div>
                </div>
              )) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-12">
                  <CalendarIcon className="h-8 w-8 mb-2 opacity-20" />
                  <p className="text-sm">{t("doctorPortal.noAppointmentsToday")}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pending invoices table */}
        {myPending.length > 0 && (
          <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b bg-slate-50/50 dark:bg-slate-900/50">
              <h3 className="font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                {isRtl ? 'فواتير تحتاج للتحصيل' : 'Invoices Pending Collection'}
              </h3>
            </div>
            <div className="divide-y">
              {myPending.slice(0, 5).map(inv => (
                <div key={inv.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{inv.patientName}</p>
                    <p className="text-xs text-muted-foreground">{inv.description}</p>
                  </div>
                  <div className="text-end shrink-0">
                    <p className="font-bold text-sm" dir="ltr">{fmtAED(inv.amount)}</p>
                    <span className={`text-xs ${inv.status === 'overdue' ? 'text-destructive' : 'text-amber-500'}`}>{t(`status.${inv.status}`)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
  // ── END Doctor dashboard ──────────────────────────────────────────────

  return (
    <div className="space-y-8 pb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{t("dashboard.overview")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("dashboard.overviewDesc")}</p>
      </div>

      {/* Row 1: KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {statCards.map((stat, i) => (
          <div key={i} className={`bg-gradient-to-br ${stat.gradient} rounded-2xl p-6 text-white shadow-lg ${stat.shadow} hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden group`}>
            <div className="absolute -end-8 -top-8 bg-white/10 w-32 h-32 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
            <div className="flex items-center justify-between relative z-10">
              <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20">
                <stat.icon className="h-5 w-5 text-white" />
              </div>
              <div className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm border border-white/20">
                {stat.trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                <span dir="ltr">{stat.trend}</span>
              </div>
            </div>
            <div className="mt-6 relative z-10">
              <h3 className="text-sm font-medium text-white/80">{stat.title}</h3>
              <p className="text-3xl font-bold mt-1 tracking-tight">
                <CountUp end={stat.value} isCurrency={stat.isCurrency} locale={numLocale} />
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Row 2: Calendar & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compact Calendar */}
        <div className="bg-card border rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
            <div>
              <h3 className="font-semibold">{t("dashboard.schedule")}</h3>
              <p className="text-xs text-muted-foreground">{t("dashboard.scheduleDesc")}</p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors">
                <ChevronLeft className={`h-4 w-4 ${isRtl ? 'rotate-180' : ''}`} />
              </button>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors">
                <ChevronRight className={`h-4 w-4 ${isRtl ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>
          <div className="p-5">
            <div className="text-center font-medium text-sm mb-4 text-primary">
              {format(currentMonth, 'MMMM yyyy', { locale })}
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground mb-2">
              {['S','M','T','W','T','F','S'].map((d, i) => <div key={i} className="font-medium">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {/* Padding for first day */}
              {Array.from({ length: daysInMonth[0].getDay() }).map((_, i) => <div key={`pad-${i}`} />)}
              
              {daysInMonth.map(day => {
                const dayAppts = appointments?.filter(a => isSameDay(parseISO(a.date), day));
                const hasAppts = dayAppts && dayAppts.length > 0;
                const isSelected = isSameDay(day, selectedDate);
                const isTodayDay = isToday(day);

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={`
                      aspect-square rounded-full flex flex-col items-center justify-center text-sm relative transition-all
                      ${isSelected ? 'bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/30' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground'}
                      ${isTodayDay && !isSelected ? 'text-primary font-bold' : ''}
                    `}
                  >
                    {format(day, 'd')}
                    {hasAppts && (
                      <span className={`absolute bottom-1 h-1 w-1 rounded-full ${isSelected ? 'bg-white' : 'bg-primary'}`}></span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
          {/* Selected Date Preview */}
          <div className="mt-auto border-t bg-slate-50/50 dark:bg-slate-900/50 p-4">
            <div className="text-sm font-medium mb-3 flex items-center justify-between">
              <span>{format(selectedDate, 'MMM d, yyyy', { locale })}</span>
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{selectedDateAppointments.length} Appts</span>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
              {selectedDateAppointments.length > 0 ? (
                selectedDateAppointments.map(appt => (
                  <div key={appt.id} className="text-xs flex items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded border">
                    <span className="font-medium text-slate-500 w-12 shrink-0">{appt.time}</span>
                    <span className="font-medium truncate">{appt.patientName}</span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-muted-foreground text-center py-4">{t("appointments.noAppointments")}</div>
              )}
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="lg:col-span-2 bg-card border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold">{t("dashboard.appointmentTrends")}</h3>
              <p className="text-sm text-muted-foreground">{t("dashboard.appointmentTrendsDesc")}</p>
            </div>
          </div>
          <div className="h-[350px] w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={appointmentsByDay} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(val) => format(parseISO(val), 'MMM d', { locale })} 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  labelFormatter={(val) => format(parseISO(val as string), 'MMM d, yyyy', { locale })}
                />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorCount)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 4: Quick Actions */}
      <div className="bg-slate-50 dark:bg-slate-900/50 border rounded-2xl p-4 flex gap-4 overflow-x-auto custom-scrollbar items-center">
        <div className="text-sm font-semibold text-slate-500 whitespace-nowrap px-2 flex items-center gap-2">
          {t("dashboard.quickActions")}
          <ArrowRight className={`h-4 w-4 ${isRtl ? 'rotate-180' : ''}`} />
        </div>
        <Link href="/patients?new=1" className="flex items-center gap-2 bg-white dark:bg-slate-800 border px-4 py-2 rounded-xl text-sm font-medium hover:border-primary hover:text-primary transition-colors whitespace-nowrap shadow-sm hover:shadow">
          <Plus className="h-4 w-4" /> {t("dashboard.newPatient")}
        </Link>
        <Link href="/appointments?new=1" className="flex items-center gap-2 bg-white dark:bg-slate-800 border px-4 py-2 rounded-xl text-sm font-medium hover:border-primary hover:text-primary transition-colors whitespace-nowrap shadow-sm hover:shadow">
          <CalendarIcon className="h-4 w-4" /> {t("dashboard.newAppointment")}
        </Link>
        <Link href="/invoices?new=1" className="flex items-center gap-2 bg-white dark:bg-slate-800 border px-4 py-2 rounded-xl text-sm font-medium hover:border-primary hover:text-primary transition-colors whitespace-nowrap shadow-sm hover:shadow">
          <DollarSign className="h-4 w-4" /> {t("dashboard.newInvoice")}
        </Link>
        <Link href="/prescriptions?new=1" className="flex items-center gap-2 bg-white dark:bg-slate-800 border px-4 py-2 rounded-xl text-sm font-medium hover:border-primary hover:text-primary transition-colors whitespace-nowrap shadow-sm hover:shadow">
          <Pill className="h-4 w-4" /> {t("dashboard.newPrescription")}
        </Link>
      </div>

      {/* Row 3: Insights & Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Schedule List */}
        <div className="bg-card border rounded-2xl shadow-sm flex flex-col h-[400px]">
          <div className="p-5 border-b bg-slate-50/50 dark:bg-slate-900/50">
            <h3 className="font-semibold flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-primary" />
              {t("dashboard.todaysSchedule")}
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
            {todaysAppointments.length > 0 ? (
              <div className="space-y-1">
                {todaysAppointments.map(appt => (
                  <div key={appt.id} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl flex items-center gap-3 transition-colors group border border-transparent hover:border-border">
                    <div className="text-sm font-semibold w-14 shrink-0 text-slate-500 group-hover:text-primary transition-colors">
                      {appt.time}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate text-foreground">{appt.patientName}</p>
                      <p className="text-xs text-muted-foreground truncate">{appt.doctorName}</p>
                    </div>
                    <div className={`text-[10px] px-2 py-1 rounded-full font-medium ${
                      appt.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                      appt.status === 'confirmed' ? 'bg-indigo-100 text-indigo-700' :
                      appt.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {t(`status.${appt.status}`)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <CalendarIcon className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-sm">{t("doctorPortal.noAppointmentsToday")}</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-card border rounded-2xl shadow-sm flex flex-col h-[400px]">
          <div className="p-5 border-b bg-slate-50/50 dark:bg-slate-900/50">
            <h3 className="font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              {t("dashboard.recentActivity")}
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <div className="space-y-6">
              {activity?.map((item, index) => {
                const isLast = index === activity.length - 1;
                let Icon = Activity;
                let colorClass = "text-blue-500 bg-blue-100 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800";
                
                if (item.type === 'appointment_created') {
                  Icon = CalendarIcon;
                  colorClass = "text-emerald-600 bg-emerald-100 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-900/30 dark:border-emerald-800";
                } else if (item.type === 'patient_registered') {
                  Icon = Users;
                  colorClass = "text-indigo-600 bg-indigo-100 border-indigo-200 dark:text-indigo-400 dark:bg-indigo-900/30 dark:border-indigo-800";
                } else if (item.type === 'invoice_paid') {
                  Icon = DollarSign;
                  colorClass = "text-amber-600 bg-amber-100 border-amber-200 dark:text-amber-400 dark:bg-amber-900/30 dark:border-amber-800";
                } else if (item.type === 'record_added') {
                  Icon = FileText;
                  colorClass = "text-cyan-600 bg-cyan-100 border-cyan-200 dark:text-cyan-400 dark:bg-cyan-900/30 dark:border-cyan-800";
                }

                return (
                  <div key={item.id} className="relative flex gap-4">
                    {!isLast && (
                      <div className="absolute start-[15px] top-8 bottom-[-24px] w-px bg-slate-200 dark:bg-slate-800" />
                    )}
                    <div className={`relative z-10 h-8 w-8 rounded-full border flex items-center justify-center shrink-0 ${colorClass}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex flex-col">
                      <p className="text-sm font-medium text-foreground">{item.description}</p>
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground" dir="ltr">
                        <Clock className="h-3 w-3" />
                        <span>{format(parseISO(item.timestamp), 'MMM d, h:mm a', { locale })}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* AI Insights Card */}
        <div className="bg-card border rounded-2xl shadow-sm flex flex-col h-[400px] overflow-hidden relative">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500"></div>
          <div className="p-5 border-b bg-slate-50/50 dark:bg-slate-900/50">
            <h3 className="font-semibold flex items-center gap-2">
              <Bot className="h-4 w-4 text-violet-500" />
              {t("dashboard.aiInsights")}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">{t("dashboard.aiInsightsDesc")}</p>
          </div>
          <div className="flex-1 p-5 flex flex-col justify-center space-y-4">
            
            {busiestDocName && (
              <div className="bg-violet-50 dark:bg-violet-900/10 border border-violet-100 dark:border-violet-900/30 p-4 rounded-xl flex items-start gap-3">
                <Stethoscope className="h-5 w-5 text-violet-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-violet-900 dark:text-violet-200">{t("dashboard.busiestDoctor")}</h4>
                  <p className="text-xs text-violet-700 dark:text-violet-300 mt-1">
                    {busiestDocName} has the highest patient load this month ({busiestDoc?.[1]} appointments).
                  </p>
                </div>
              </div>
            )}

            {pendingPayments > 0 && (
              <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 p-4 rounded-xl flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-orange-900 dark:text-orange-200">{t("dashboard.pendingInvoicesAlert")}</h4>
                  <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                    There are {new Intl.NumberFormat(numLocale, { style: 'currency', currency: 'AED' }).format(pendingPayments)} in pending payments to collect.
                  </p>
                </div>
              </div>
            )}

            <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 p-4 rounded-xl flex items-start gap-3">
              <Users className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">{t("dashboard.noFollowUp")}</h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                  12 patients seen last week have no follow-up scheduled.
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Row 5: Revenue Chart */}
      <div className="bg-card border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold">{t("dashboard.revenueOverview")}</h3>
            <p className="text-sm text-muted-foreground">{t("dashboard.revenueOverviewDesc")}</p>
          </div>
        </div>
        <div className="h-[300px] w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueByMonth} margin={{ top: 10, right: 10, left: -10, bottom: 0 }} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="month" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                dy={10}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) => `${val/1000}k`}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              />
              <RechartsTooltip 
                cursor={{ fill: 'hsl(var(--muted))' }}
                contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                formatter={(value: number) => [new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 }).format(value), t("dashboard.revenue")]}
              />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
