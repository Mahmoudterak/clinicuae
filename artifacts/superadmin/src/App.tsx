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
import Communications from '@/pages/communications';
import Backups from '@/pages/backups';
import SecurityPage from '@/pages/security';
import SandboxPage from '@/pages/sandbox';
import { AccessDenied } from '@/components/layout/AccessDenied';
import UsersPage from '@/pages/users';
import { AuthContext, useAuthState, useAuth, hasPermission, type SuperAdminRole, ROLE_PERMISSIONS } from '@/hooks/use-auth';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

function ProtectedRoute({
  component: Component,
  permission,
}: {
  component: React.ComponentType;
  permission?: keyof typeof ROLE_PERMISSIONS;
}) {
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();

  if (!isAuthenticated) {
    setLocation('/login');
    return null;
  }

  if (permission && !hasPermission(user?.role as SuperAdminRole | undefined, permission)) {
    return <AccessDenied />;
  }

  return <Component />;
}

function Protected({
  component,
  permission,
}: {
  component: React.ComponentType;
  permission?: keyof typeof ROLE_PERMISSIONS;
}) {
  return (
    <AdminLayout>
      <ProtectedRoute component={component} permission={permission} />
    </AdminLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">{() => <Protected component={Dashboard} permission="readDashboard" />}</Route>
      <Route path="/clinics">{() => <Protected component={Clinics} permission="readClinics" />}</Route>
      <Route path="/subscriptions">{() => <Protected component={Subscriptions} permission="managePlans" />}</Route>
      <Route path="/audit-logs">{() => <Protected component={AuditLogs} permission="viewAuditLogs" />}</Route>
      <Route path="/feature-flags">{() => <Protected component={FeatureFlags} permission="managePlatform" />}</Route>
      <Route path="/system-health">{() => <Protected component={SystemHealth} permission="viewSystemHealth" />}</Route>
      <Route path="/settings">{() => <Protected component={SaSettings} permission="managePlatform" />}</Route>
      <Route path="/developer">{() => <Protected component={Developer} permission="viewDeveloper" />}</Route>
      <Route path="/users">{() => <Protected component={UsersPage} permission="manageUsers" />}</Route>
      <Route path="/communications">{() => <Protected component={Communications} permission="managePlatform" />}</Route>
      <Route path="/backups">{() => <Protected component={Backups} permission="managePlatform" />}</Route>
      <Route path="/security">{() => <Protected component={SecurityPage} permission="managePlatform" />}</Route>
      <Route path="/sandbox">{() => <Protected component={SandboxPage} permission="viewDeveloper" />}</Route>
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

/** Single shared auth state — all consumers read from this context. */
function AuthProvider({ children }: { children: React.ReactNode }) {
  const authState = useAuthState();
  return <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>;
}
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
