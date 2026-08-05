import { useAuth } from "@/contexts/auth-context";
import { 
  useListPatients, 
  useListDoctors, 
  useListAppointments, 
  useListInvoices, 
  useListLabRequests,
  useListInventory,
  useListInsurance
} from "@workspace/api-client-react";
import { useTranslation } from "@/i18n/context";
import { format, parseISO, isAfter, isBefore, addDays, subMonths, subDays } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import { 
  Bot, 
  Activity, 
  TrendingUp, 
  Package, 
  FlaskConical, 
  CalendarClock, 
  ShieldAlert,
  ArrowRight,
  Info,
  AlertTriangle,
  Lightbulb
} from "lucide-react";
import { Link } from "wouter";

export default function AIAssistant() {
  const { t, isRtl } = useTranslation();
  const locale = isRtl ? arLocale : enUS;
  const numLocale = isRtl ? 'ar-AE' : 'en-US';
  const { role, doctorId } = useAuth();

  const { data: patients } = useListPatients();
  const { data: doctors } = useListDoctors();
  const { data: appts } = useListAppointments(role === 'doctor' ? { doctorId } : undefined);
  const { data: invoices } = useListInvoices(role === 'doctor' ? { doctorId } : undefined);
  const { data: labs } = useListLabRequests(role === 'doctor' ? { doctorId } : undefined);
  const { data: inventory } = useListInventory();
  const { data: insurance } = useListInsurance();

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // --- Insight Computations ---

  // 1. Busiest Doctor Today (from appointments where date = today)
  const todaysAppts = appts?.filter(a => a.date.startsWith(todayStr)) || [];
  const doctorCounts = todaysAppts.reduce((acc: any, curr) => {
    acc[curr.doctorId] = (acc[curr.doctorId] || 0) + 1;
    return acc;
  }, {});
  let busiestDocId: number | null = null;
  let busiestDocAppts = 0;
  Object.entries(doctorCounts).forEach(([id, count]) => {
    if ((count as number) > busiestDocAppts) {
      busiestDocAppts = count as number;
      busiestDocId = Number(id);
    }
  });
  const busiestDoctorName = doctors?.find(d => d.id === busiestDocId)?.lastName;

  // 2. Revenue Prediction (avg last 3 months * 1.1)
  const threeMonthsAgo = subMonths(new Date(), 3);
  const recentInvoices = invoices?.filter(i => i.status === 'paid' && isAfter(parseISO(i.issuedDate), threeMonthsAgo)) || [];
  const totalRecentRev = recentInvoices.reduce((sum, i) => sum + i.amount, 0);
  const predictedRev = (totalRecentRev / 3) * 1.1;

  // 3. Inventory Alert
  const lowStockItems = inventory?.filter(i => i.quantity <= i.minQuantity) || [];

  // 4. Pending Lab Results
  const pendingLabs = labs?.filter(l => l.status === 'pending' || l.status === 'in_progress') || [];

  // 5. Follow-up Needed (patients with appt > 30 days ago and no upcoming appt)
  const thirtyDaysAgo = subDays(new Date(), 30);
  const pastAppts = appts?.filter(a => isBefore(parseISO(a.date), thirtyDaysAgo)) || [];
  const futureAppts = appts?.filter(a => isAfter(parseISO(a.date), new Date())) || [];
  const pastPatientIds = new Set(pastAppts.map(a => a.patientId));
  const futurePatientIds = new Set(futureAppts.map(a => a.patientId));
  const needsFollowUp = Array.from(pastPatientIds).filter(id => !futurePatientIds.has(id));

  // 6. Insurance Expiring
  const expiringIns = insurance?.filter(r => {
    if (!r.expiryDate) return false;
    const expiry = parseISO(r.expiryDate);
    return isBefore(expiry, addDays(new Date(), 30)) && isAfter(expiry, new Date());
  }) || [];


  // --- Recommendations Generation ---
  const recommendations = [];

  if (busiestDocId) {
    recommendations.push({
      id: 'doc',
      type: 'warning',
      icon: Activity,
      title: 'High Workload Detected',
      message: `Dr. ${busiestDoctorName} has ${busiestDocAppts} appointments today. Consider reallocating walk-in patients or adding buffer time to their schedule.`,
      actionText: 'View Schedule',
      actionLink: '/appointments'
    });
  }

  if (predictedRev > 0 && role === 'admin') {
    recommendations.push({
      id: 'rev',
      type: 'info',
      icon: TrendingUp,
      title: 'Revenue Growth Projected',
      message: `Based on a 3-month trend, next month's revenue is projected to hit ${new Intl.NumberFormat(numLocale, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(predictedRev)}. Outstanding pending invoices total ${new Intl.NumberFormat(numLocale, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(invoices?.filter(i=>i.status==='pending').reduce((a,b)=>a+b.amount,0)||0)}.`,
      actionText: 'Review Invoices',
      actionLink: '/invoices'
    });
  }

  if (lowStockItems.length > 0 && role === 'admin') {
    recommendations.push({
      id: 'inv',
      type: 'alert',
      icon: Package,
      title: 'Critical Inventory Levels',
      message: `${lowStockItems.length} items have fallen below their minimum required threshold. Immediate restocking is recommended.`,
      actionText: 'Manage Inventory',
      actionLink: '/inventory'
    });
  }

  if (pendingLabs.length > 0) {
    recommendations.push({
      id: 'lab',
      type: 'warning',
      icon: FlaskConical,
      title: 'Pending Lab Results',
      message: `There are ${pendingLabs.length} laboratory requests awaiting review. ${pendingLabs.filter(l=>l.priority==='urgent' || l.priority==='stat').length} of these are marked as urgent or STAT.`,
      actionText: 'Review Labs',
      actionLink: '/lab'
    });
  }

  if (needsFollowUp.length > 0) {
    recommendations.push({
      id: 'fup',
      type: 'info',
      icon: CalendarClock,
      title: 'Follow-ups Overdue',
      message: `${needsFollowUp.length} patients have not been seen in over 30 days and have no future appointments scheduled. Consider an outreach campaign.`,
      actionText: 'View Patients',
      actionLink: '/patients'
    });
  }

  if (expiringIns.length > 0 && role === 'admin') {
    recommendations.push({
      id: 'ins',
      type: 'warning',
      icon: ShieldAlert,
      title: 'Insurance Policies Expiring',
      message: `${expiringIns.length} patient insurance policies are expiring within the next 30 days. Notify patients to update their records.`,
      actionText: 'Review Policies',
      actionLink: '/insurance'
    });
  }

  // Ensure there's always at least something if no real alerts fire
  if (recommendations.length === 0) {
    recommendations.push({
      id: 'ok',
      type: 'info',
      icon: Bot,
      title: 'All Systems Optimal',
      message: 'Clinic metrics are within normal operating parameters. No critical alerts or urgent actions required at this time.',
    });
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)]">
      {/* Left Sidebar - Insight Cards */}
      <div className="w-full lg:w-80 flex flex-col gap-4 overflow-y-auto custom-scrollbar pe-2 shrink-0">
        <div className="bg-gradient-to-br from-indigo-900 to-violet-900 p-6 rounded-3xl text-white shadow-lg relative overflow-hidden shrink-0">
          <div className="absolute top-0 end-0 bg-white/10 w-40 h-40 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3"></div>
          <Bot className="h-8 w-8 mb-4 text-violet-300" />
          <h2 className="text-xl font-bold tracking-tight mb-1">AI Insights</h2>
          <p className="text-xs text-indigo-200">Real-time clinical and operational analysis.</p>
        </div>

        <div className="bg-card border rounded-2xl p-4 flex items-center gap-4 shadow-sm">
          <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Busiest Doctor Today</div>
            <div className="font-bold">{busiestDoctorName ? `Dr. ${busiestDoctorName}` : '---'}</div>
          </div>
        </div>

        {role === 'admin' && (
          <div className="bg-card border rounded-2xl p-4 flex items-center gap-4 shadow-sm">
            <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Est. Next Month Rev</div>
              <div className="font-bold" dir="ltr">{new Intl.NumberFormat(numLocale, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(predictedRev)}</div>
            </div>
          </div>
        )}

        {role === 'admin' && (
          <div className="bg-card border rounded-2xl p-4 flex items-center gap-4 shadow-sm">
            <div className="h-10 w-10 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Inventory Alert</div>
              <div className="font-bold">{lowStockItems.length} Items Low</div>
            </div>
          </div>
        )}

        <div className="bg-card border rounded-2xl p-4 flex items-center gap-4 shadow-sm">
          <div className="h-10 w-10 rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
            <FlaskConical className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Pending Labs</div>
            <div className="font-bold">{pendingLabs.length} Results</div>
          </div>
        </div>

        <div className="bg-card border rounded-2xl p-4 flex items-center gap-4 shadow-sm">
          <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
            <CalendarClock className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Overdue Follow-ups</div>
            <div className="font-bold">{needsFollowUp.length} Patients</div>
          </div>
        </div>

        {role === 'admin' && (
          <div className="bg-card border rounded-2xl p-4 flex items-center gap-4 shadow-sm">
            <div className="h-10 w-10 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 flex items-center justify-center shrink-0">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Policies Expiring</div>
              <div className="font-bold">{expiringIns.length} Records</div>
            </div>
          </div>
        )}
      </div>

      {/* Main Area - Recommendations Feed */}
      <div className="flex-1 bg-slate-50 dark:bg-slate-900/30 rounded-3xl border shadow-inner p-6 overflow-y-auto custom-scrollbar relative">
        <h3 className="text-lg font-bold mb-6 px-2 text-slate-800 dark:text-slate-200">Recommended Actions</h3>
        
        <div className="space-y-4">
          {recommendations.map((rec) => {
            
            const styles = {
              info: "bg-white dark:bg-slate-800 border-indigo-100 dark:border-indigo-900/50 shadow-indigo-500/5",
              warning: "bg-white dark:bg-slate-800 border-amber-100 dark:border-amber-900/50 shadow-amber-500/5",
              alert: "bg-white dark:bg-slate-800 border-red-100 dark:border-red-900/50 shadow-red-500/5"
            };

            const iconStyles = {
              info: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20",
              warning: "text-amber-600 bg-amber-50 dark:bg-amber-900/20",
              alert: "text-red-600 bg-red-50 dark:bg-red-900/20"
            };

            const IconComp = rec.type === 'info' ? Lightbulb : rec.type === 'warning' ? AlertTriangle : AlertTriangle;

            return (
              <div key={rec.id} className={`p-6 rounded-2xl border shadow-sm transition-all hover:shadow-md ${styles[rec.type as keyof typeof styles]}`}>
                <div className="flex gap-4">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${iconStyles[rec.type as keyof typeof iconStyles]}`}>
                    <rec.icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-base">{rec.title}</h4>
                      <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 ${iconStyles[rec.type as keyof typeof iconStyles]}`}>
                        <IconComp className="h-3 w-3" /> {rec.type}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                      {rec.message}
                    </p>
                    {rec.actionLink && (
                      <Link href={rec.actionLink}>
                        <button className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-2 transition-colors">
                          {rec.actionText} <ArrowRight className={`h-4 w-4 ${isRtl ? 'rotate-180' : ''}`} />
                        </button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  );
}
