import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { AdminLayout } from '@/components/layout/AdminLayout';
import Login from '@/pages/login';
import Dashboard from '@/pages/dashboard';
import Clinics from '@/pages/clinics';
import { useAuth } from '@/hooks/use-auth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
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

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      
      {/* Protected Routes */}
      <Route path="/">
        <AdminLayout>
          <ProtectedRoute component={Dashboard} />
        </AdminLayout>
      </Route>
      
      <Route path="/clinics">
        <AdminLayout>
          <ProtectedRoute component={Clinics} />
        </AdminLayout>
      </Route>

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
