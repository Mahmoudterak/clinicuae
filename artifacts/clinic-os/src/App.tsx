import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { AppLayout } from './components/layout/app-layout';
import { ThemeProvider } from './components/theme-provider';
import NotFound from '@/pages/not-found';

import Dashboard from './pages/dashboard';
import PatientsList from './pages/patients/index';
import PatientDetail from './pages/patients/detail';
import DoctorsList from './pages/doctors/index';
import AppointmentsList from './pages/appointments/index';
import RecordsList from './pages/records/index';
import PrescriptionsList from './pages/prescriptions/index';
import InvoicesList from './pages/invoices/index';

const queryClient = new QueryClient();

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/patients" component={PatientsList} />
        <Route path="/patients/:id" component={PatientDetail} />
        <Route path="/doctors" component={DoctorsList} />
        <Route path="/appointments" component={AppointmentsList} />
        <Route path="/records" component={RecordsList} />
        <Route path="/prescriptions" component={PrescriptionsList} />
        <Route path="/invoices" component={InvoicesList} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
