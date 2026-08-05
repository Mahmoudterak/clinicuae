import { useAuth } from "@/contexts/auth-context";
import { 
  useListPatients, 
  useListDoctors, 
  useListAppointments, 
  useListInvoices, 
  useListLabRequests, 
  useListRadiologyRequests 
} from "@workspace/api-client-react";
import { useTranslation } from "@/i18n/context";
import { 
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from "recharts";
import { format, parseISO, subMonths } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import { Loader2 } from "lucide-react";

const COLORS = ['#4F46E5', '#8B5CF6', '#10B981', '#F59E0B', '#3B82F6', '#EF4444'];

export default function Reports() {
  const { t, isRtl } = useTranslation();
  const locale = isRtl ? arLocale : enUS;
  const numLocale = isRtl ? 'ar-AE' : 'en-US';
  const { role, doctorId } = useAuth();

  const { data: patients, isLoading: l1 } = useListPatients();
  const { data: doctors, isLoading: l2 } = useListDoctors();
  const { data: appts, isLoading: l3 } = useListAppointments(role === 'doctor' ? { doctorId } : undefined);
  const { data: invoices, isLoading: l4 } = useListInvoices(role === 'doctor' ? { doctorId } : undefined);
  const { data: labs, isLoading: l5 } = useListLabRequests(role === 'doctor' ? { doctorId } : undefined);
  const { data: rads, isLoading: l6 } = useListRadiologyRequests(role === 'doctor' ? { doctorId } : undefined);

  if (l1 || l2 || l3 || l4 || l5 || l6) {
    return <div className="flex items-center justify-center min-h-[60vh] text-indigo-500"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  // --- Financial Data ---
  const paidInvoices = invoices?.filter(i => i.status === 'paid') || [];
  const pendingInvoices = invoices?.filter(i => i.status === 'pending') || [];
  const totalRevenue = paidInvoices.reduce((sum, i) => sum + i.amount, 0);
  const avgRevenue = paidInvoices.length ? totalRevenue / paidInvoices.length : 0;
  const totalPending = pendingInvoices.reduce((sum, i) => sum + i.amount, 0);

  const revenueByMonth = paidInvoices.reduce((acc: any, curr) => {
    const month = format(parseISO(curr.issuedDate), 'MMM yyyy');
    if (!acc[month]) acc[month] = 0;
    acc[month] += curr.amount;
    return acc;
  }, {});
  const revenueChartData = Object.entries(revenueByMonth).map(([name, value]) => ({ name, value }));

  // --- Clinical Data ---
  const statusCounts = appts?.reduce((acc: any, curr) => {
    acc[curr.status] = (acc[curr.status] || 0) + 1;
    return acc;
  }, {});
  const statusChartData = Object.entries(statusCounts || {}).map(([name, value]) => ({ name: t(`status.${name}`), value }));

  const doctorCounts = appts?.reduce((acc: any, curr) => {
    acc[curr.doctorId] = (acc[curr.doctorId] || 0) + 1;
    return acc;
  }, {});
  const doctorChartData = Object.entries(doctorCounts || {})
    .map(([id, value]) => ({
      name: doctors?.find(d => d.id === Number(id))?.lastName || `Doc ${id}`,
      value
    }))
    .sort((a, b) => (b.value as number) - (a.value as number))
    .slice(0, 5);

  const totalLabs = labs?.length || 0;
  const totalRads = rads?.length || 0;

  // --- Demographics Data (Client filtered for doctor if needed) ---
  const doctorPatientIds = role === 'doctor' && appts ? new Set(appts.map(a => a.patientId)) : null;
  const scopedPatients = role === 'doctor' && doctorPatientIds ? patients?.filter(p => doctorPatientIds.has(p.id)) : patients;

  const genderCounts = scopedPatients?.reduce((acc: any, curr) => {
    acc[curr.gender] = (acc[curr.gender] || 0) + 1;
    return acc;
  }, {});
  const genderChartData = Object.entries(genderCounts || {}).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("nav.reports")}</h1>
        <p className="text-muted-foreground mt-1">Data insights across the clinic.</p>
      </div>

      {/* Financial Section */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b pb-2">Financial Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card border rounded-2xl p-6 shadow-sm">
            <div className="text-sm text-muted-foreground mb-1">Total Revenue</div>
            <div className="text-3xl font-bold text-emerald-600" dir="ltr">{new Intl.NumberFormat(numLocale, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalRevenue)}</div>
          </div>
          <div className="bg-card border rounded-2xl p-6 shadow-sm">
            <div className="text-sm text-muted-foreground mb-1">Average Invoice</div>
            <div className="text-3xl font-bold text-indigo-600" dir="ltr">{new Intl.NumberFormat(numLocale, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(avgRevenue)}</div>
          </div>
          <div className="bg-card border rounded-2xl p-6 shadow-sm">
            <div className="text-sm text-muted-foreground mb-1">Pending Collection</div>
            <div className="text-3xl font-bold text-amber-500" dir="ltr">{new Intl.NumberFormat(numLocale, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalPending)}</div>
          </div>
        </div>

        <div className="bg-card border rounded-2xl p-6 shadow-sm">
          <h3 className="font-semibold mb-4">Revenue by Month</h3>
          <div className="h-[300px]" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={v => `$${v/1000}k`} tick={{ fontSize: 12 }} />
                <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="value" fill="#4F46E5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Clinical Section */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b pb-2">Clinical Activity</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-card border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Total Appointments</div>
              <div className="text-3xl font-bold text-foreground">{appts?.length || 0}</div>
            </div>
            <div className="h-[200px] mt-4" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value">
                    {statusChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="lg:col-span-2 bg-card border rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold mb-4">Appointments per Doctor (Top 5)</h3>
            <div className="h-[250px]" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={doctorChartData} layout="vertical" margin={{ top: 0, right: 10, left: 30, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                  <Bar dataKey="value" fill="#8B5CF6" radius={[0, 6, 6, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      {/* Demographics Section */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b pb-2">Patient Demographics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card border rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold mb-4">Gender Split</h3>
            <div className="h-[250px]" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={genderChartData} cx="50%" cy="50%" innerRadius={0} outerRadius={100} dataKey="value" label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {genderChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={['#3B82F6', '#EC4899', '#94A3B8'][index % 3]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card border rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold mb-4">Diagnostics Overview</h3>
            <div className="flex flex-col gap-6 justify-center h-[250px]">
              <div className="flex items-center justify-between p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                <div>
                  <div className="text-sm font-medium text-indigo-900 dark:text-indigo-200">Total Lab Requests</div>
                  <div className="text-xs text-indigo-700 dark:text-indigo-300 mt-1">Across all categories</div>
                </div>
                <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{totalLabs}</div>
              </div>
              <div className="flex items-center justify-between p-4 bg-violet-50 dark:bg-violet-900/20 rounded-xl">
                <div>
                  <div className="text-sm font-medium text-violet-900 dark:text-violet-200">Total Radiology Requests</div>
                  <div className="text-xs text-violet-700 dark:text-violet-300 mt-1">All study types</div>
                </div>
                <div className="text-3xl font-bold text-violet-600 dark:text-violet-400">{totalRads}</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
