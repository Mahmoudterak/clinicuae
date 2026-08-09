import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { AdminLayout } from '@/components/layout/AdminLayout';
import Login from '@/pages/login';
import Dashboard from '@/pages/dashboard';
import Clinics from '@/pages/clinics';
import Subscriptions from '@/pages/subscriptions';
import AuditLogs from '@/pages/audit-logs';
import FeatureFlags from '@/pages/feature-flags';
import SystemHealth from '@/pages/system-health';
import SaSettings from '@/pages/sa-settings';
import Developer from '@/pages/developer';
import Users from '@/pages/users';
import Communications from '@/pages/communications';
import Backups from '@/pages/backups';
import SecurityPage from '@/pages/security';
import SandboxPage from '@/pages/sandbox';
import { useAuth } from '@/hooks/use-auth';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  if (!isAuthenticated) {
    setLocation('/login');
    return null;
  }
  return <Component />;
}

function Protected({ component: Component }: { component: React.ComponentType }) {
  return (
    <AdminLayout>
      <ProtectedRoute component={Component} />
    </AdminLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">{() => <Protected component={Dashboard} />}</Route>
      <Route path="/clinics">{() => <Protected component={Clinics} />}</Route>
      <Route path="/users">{() => <Protected component={Users} />}</Route>
      <Route path="/subscriptions">{() => <Protected component={Subscriptions} />}</Route>
      <Route path="/audit-logs">{() => <Protected component={AuditLogs} />}</Route>
      <Route path="/feature-flags">{() => <Protected component={FeatureFlags} />}</Route>
      <Route path="/system-health">{() => <Protected component={SystemHealth} />}</Route>
      <Route path="/settings">{() => <Protected component={SaSettings} />}</Route>
      <Route path="/developer">{() => <Protected component={Developer} />}</Route>
      <Route path="/communications">{() => <Protected component={Communications} />}</Route>
      <Route path="/backups">{() => <Protected component={Backups} />}</Route>
      <Route path="/security">{() => <Protected component={SecurityPage} />}</Route>
      <Route path="/sandbox">{() => <Protected component={SandboxPage} />}</Route>
      <Route>
        <AdminLayout>
          <div className="flex h-[50vh] flex-col items-center justify-center text-center space-y-4">
            <h1 className="text-4xl font-bold">404</h1>
            <p className="text-muted-foreground text-lg">الصفحة غير موجودة</p>
          </div>
        </AdminLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Router />
      </WouterRouter>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
