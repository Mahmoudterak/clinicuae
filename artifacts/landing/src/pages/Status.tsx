import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import {
  Stethoscope, CheckCircle2, XCircle, AlertCircle, RefreshCw,
  Server, Database, HardDrive, Lock, Mail, MessageCircle, CreditCard, Cpu,
} from 'lucide-react';

// ── types ─────────────────────────────────────────────────────────────────────
type ServiceStatus = 'ok' | 'error' | 'unconfigured' | 'loading';

interface ServiceResult {
  status: ServiceStatus;
  message?: string;
}

interface HealthData {
  status: 'ok' | 'degraded' | 'down';
  checkedAt: string;
  services: {
    api: ServiceResult;
    database: ServiceResult;
    storage: ServiceResult;
    authentication: ServiceResult;
    email: ServiceResult;
    whatsapp: ServiceResult;
    payments: ServiceResult;
    backgroundJobs: ServiceResult;
  };
}

// ── service metadata ───────────────────────────────────────────────────────────
const SERVICE_META: Record<
  keyof HealthData['services'],
  { label: string; icon: React.ElementType }
> = {
  api:            { label: 'API',              icon: Server },
  database:       { label: 'Database',         icon: Database },
  storage:        { label: 'Storage',          icon: HardDrive },
  authentication: { label: 'Authentication',   icon: Lock },
  email:          { label: 'Email',            icon: Mail },
  whatsapp:       { label: 'WhatsApp',         icon: MessageCircle },
  payments:       { label: 'Payments',         icon: CreditCard },
  backgroundJobs: { label: 'Background Jobs',  icon: Cpu },
};

// ── helpers ────────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: ServiceStatus }) {
  if (status === 'loading') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" />
        Checking…
      </span>
    );
  }
  if (status === 'ok') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Healthy
      </span>
    );
  }
  if (status === 'unconfigured') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <AlertCircle className="w-3.5 h-3.5" />
        Not configured
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
      <XCircle className="w-3.5 h-3.5" />
      Error
    </span>
  );
}

function OverallBanner({ health, loading }: { health: HealthData | null; loading: boolean }) {
  if (loading || !health) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-4 w-48 bg-slate-200 rounded animate-pulse" />
          <div className="h-3 w-32 bg-slate-100 rounded animate-pulse" />
        </div>
      </div>
    );
  }
  const ok = health.status === 'ok';
  return (
    <div
      className={`rounded-2xl border px-6 py-5 flex items-center gap-4 ${
        ok
          ? 'bg-emerald-50 border-emerald-200'
          : 'bg-amber-50 border-amber-200'
      }`}
    >
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
          ok ? 'bg-emerald-500' : 'bg-amber-500'
        }`}
      >
        {ok ? (
          <CheckCircle2 className="w-5 h-5 text-white" />
        ) : (
          <AlertCircle className="w-5 h-5 text-white" />
        )}
      </div>
      <div>
        <div className={`font-bold text-base ${ok ? 'text-emerald-800' : 'text-amber-800'}`}>
          {ok ? 'All Systems Operational' : 'Partial Degradation Detected'}
        </div>
        <div className={`text-xs mt-0.5 ${ok ? 'text-emerald-600' : 'text-amber-600'}`}>
          Last checked:{' '}
          {new Date(health.checkedAt).toLocaleTimeString('en-AE', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────
export default function StatusPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/healthz');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: HealthData = await res.json();
      setHealth(data);
    } catch {
      setHealth({
        status: 'down',
        checkedAt: new Date().toISOString(),
        services: {
          api:            { status: 'error', message: 'API unreachable' },
          database:       { status: 'error' },
          storage:        { status: 'error' },
          authentication: { status: 'error' },
          email:          { status: 'error' },
          whatsapp:       { status: 'error' },
          payments:       { status: 'error' },
          backgroundJobs: { status: 'error' },
        },
      });
    } finally {
      setLoading(false);
      setLastRefreshed(new Date());
    }
  };

  useEffect(() => {
    fetchHealth();
    const id = setInterval(fetchHealth, 30_000);
    return () => clearInterval(id);
  }, []);

  const services = health?.services;

  return (
    <div className="min-h-screen bg-slate-50" dir="ltr">
      {/* Navbar */}
      <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 cursor-pointer">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
            <Stethoscope className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-slate-900">Clinic OS</span>
        </Link>
        <span className="text-sm font-semibold text-slate-500 tracking-wide uppercase">System Status</span>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12 space-y-6">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-2xl font-black text-slate-900 mb-1">System Health</h1>
          <p className="text-sm text-slate-500">
            Live status for all Clinic OS infrastructure components.
          </p>
        </motion.div>

        {/* Overall banner */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <OverallBanner health={health} loading={loading} />
        </motion.div>

        {/* Service rows */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden"
        >
          {(Object.keys(SERVICE_META) as (keyof HealthData['services'])[]).map((key, i) => {
            const { label, icon: Icon } = SERVICE_META[key];
            const svc = services?.[key];
            const status: ServiceStatus = loading || !svc ? 'loading' : svc.status;
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 + i * 0.04 }}
                className="flex items-center gap-4 px-5 py-4"
              >
                <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-800 text-sm">{label}</div>
                  {svc?.message && !loading && (
                    <div className="text-xs text-slate-400 mt-0.5 truncate">{svc.message}</div>
                  )}
                </div>
                <StatusBadge status={status} />
              </motion.div>
            );
          })}
        </motion.div>

        {/* Refresh row */}
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Auto-refreshes every 30 seconds</span>
          <button
            onClick={fetchHealth}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 font-medium disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {lastRefreshed
              ? `Last refreshed ${lastRefreshed.toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
              : 'Refresh'}
          </button>
        </div>
      </main>
    </div>
  );
}
