import { 
  useGetDashboardSummary, 
  useGetRecentActivity, 
  useGetAppointmentsByDay, 
  useGetRevenueByMonth 
} from "@workspace/api-client-react";
import { 
  Users, 
  Stethoscope, 
  Calendar, 
  DollarSign, 
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  FileText
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
  Bar
} from "recharts";
import { format, parseISO } from "date-fns";

export default function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: activity, isLoading: loadingActivity } = useGetRecentActivity();
  const { data: appointmentsByDay, isLoading: loadingAppts } = useGetAppointmentsByDay();
  const { data: revenueByMonth, isLoading: loadingRevenue } = useGetRevenueByMonth();

  if (loadingSummary || loadingActivity || loadingAppts || loadingRevenue) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded-md mb-8"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-muted rounded-xl"></div>)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-[400px] bg-muted rounded-xl"></div>
          <div className="h-[400px] bg-muted rounded-xl"></div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Patients",
      value: summary?.totalPatients ?? 0,
      icon: Users,
      trend: "+12.5%",
      trendUp: true,
    },
    {
      title: "Appointments Today",
      value: summary?.appointmentsToday ?? 0,
      icon: Calendar,
      trend: "+5.2%",
      trendUp: true,
    },
    {
      title: "Active Doctors",
      value: summary?.totalDoctors ?? 0,
      icon: Stethoscope,
      trend: "0%",
      trendUp: true,
    },
    {
      title: "Monthly Revenue",
      value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(summary?.revenueThisMonth ?? 0),
      icon: DollarSign,
      trend: "+18.2%",
      trendUp: true,
    }
  ];

  return (
    <div className="space-y-8 pb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Overview</h1>
        <p className="text-muted-foreground mt-1 text-sm">Here's what's happening at your clinic today.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {statCards.map((stat, i) => (
          <div key={i} className="bg-card border rounded-xl p-6 shadow-sm hover-elevate transition-shadow">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
              <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${stat.trendUp ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-destructive/10 text-destructive'}`}>
                {stat.trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {stat.trend}
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-sm font-medium text-muted-foreground">{stat.title}</h3>
              <p className="text-3xl font-bold text-foreground mt-1">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-card border rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold">Appointment Trends</h3>
                <p className="text-sm text-muted-foreground">Last 14 days of scheduled visits</p>
              </div>
            </div>
            <div className="h-[300px] w-full">
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
                    tickFormatter={(val) => format(parseISO(val), 'MMM d')} 
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
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}
                    labelFormatter={(val) => format(parseISO(val as string), 'MMM d, yyyy')}
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

          <div className="bg-card border rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold">Revenue Overview</h3>
                <p className="text-sm text-muted-foreground">Monthly revenue generation</p>
              </div>
            </div>
            <div className="h-[250px] w-full">
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
                    tickFormatter={(val) => `$${val/1000}k`}
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <RechartsTooltip 
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}
                    formatter={(value: number) => [new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value), 'Revenue']}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-card border rounded-xl shadow-sm flex flex-col h-[calc(100vh-12rem)] min-h-[600px] sticky top-24">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">Recent Activity</h3>
            <p className="text-sm text-muted-foreground">Latest actions across the clinic</p>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-8">
              {activity?.map((item, index) => {
                const isLast = index === activity.length - 1;
                
                let Icon = Activity;
                let colorClass = "text-blue-500 bg-blue-500/10";
                
                if (item.type === 'appointment_created') {
                  Icon = Calendar;
                  colorClass = "text-emerald-500 bg-emerald-500/10";
                } else if (item.type === 'patient_registered') {
                  Icon = Users;
                  colorClass = "text-purple-500 bg-purple-500/10";
                } else if (item.type === 'invoice_paid') {
                  Icon = DollarSign;
                  colorClass = "text-amber-500 bg-amber-500/10";
                } else if (item.type === 'record_added') {
                  Icon = FileText;
                  colorClass = "text-cyan-500 bg-cyan-500/10";
                }

                return (
                  <div key={item.id} className="relative flex gap-4">
                    {!isLast && (
                      <div className="absolute left-[19px] top-10 bottom-[-24px] w-px bg-border" />
                    )}
                    <div className={`relative z-10 h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col pt-1">
                      <p className="text-sm font-medium text-foreground">{item.description}</p>
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{format(parseISO(item.timestamp), 'MMM d, h:mm a')}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
