import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { AppLayout } from './components/layout/app-layout';
import { ThemeProvider } from './components/theme-provider';
import { I18nProvider } from './i18n/context';
import { AuthProvider, useAuth } from './contexts/auth-context';
import { SettingsProvider } from './contexts/settings-context';
import SettingsPage from './pages/settings/index';
import WhatsAppPage from './pages/whatsapp/index';
import BookingsPage from './pages/bookings/index';
import PublicBookingPage from './pages/book/index';
import ZapierPage from './pages/zapier/index';
import NotFound from '@/pages/not-found';

import LoginPage from './pages/login';
import Dashboard from './pages/dashboard';
import DoctorPortal from './pages/doctor-portal';
import PatientsList from './pages/patients/index';
import PatientDetail from './pages/patients/detail';
import DoctorsList from './pages/doctors/index';
import AppointmentsList from './pages/appointments/index';
import RecordsList from './pages/records/index';
import PrescriptionsList from './pages/prescriptions/index';
import InvoicesList from './pages/invoices/index';
import LabList from './pages/lab/index';
import RadiologyList from './pages/radiology/index';
import PharmacyList from './pages/pharmacy/index';
import InventoryList from './pages/inventory/index';
import DepartmentsList from './pages/departments/index';
import StaffList from './pages/staff/index';
import PaymentsList from './pages/payments/index';
import InsuranceList from './pages/insurance/index';
import Reports from './pages/reports/index';
import AIAssistant from './pages/ai-assistant/index';

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { role } = useAuth();
  const [location, setLocation] = useLocation();

  // Public route — no auth needed
  if (location === '/book' || location.startsWith('/book?')) {
    return <PublicBookingPage />;
  }

  // Use effect for redirect to avoid setState-during-render warning
  React.useEffect(() => {
    if (!role && location !== '/login') {
      setLocation('/login');
    }
  }, [role, location, setLocation]);

  if (!role) {
    return <LoginPage />;
  }

  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/doctor" component={DoctorPortal} />
        <Route path="/patients" component={PatientsList} />
        <Route path="/patients/:id" component={PatientDetail} />
        <Route path="/doctors" component={DoctorsList} />
        <Route path="/appointments" component={AppointmentsList} />
        <Route path="/records" component={RecordsList} />
        <Route path="/prescriptions" component={PrescriptionsList} />
        <Route path="/invoices" component={InvoicesList} />
        <Route path="/lab" component={LabList} />
        <Route path="/radiology" component={RadiologyList} />
        <Route path="/pharmacy" component={PharmacyList} />
        <Route path="/inventory" component={InventoryList} />
        <Route path="/departments" component={DepartmentsList} />
        <Route path="/staff" component={StaffList} />
        <Route path="/payments" component={PaymentsList} />
        <Route path="/insurance" component={InsuranceList} />
        <Route path="/reports" component={Reports} />
        <Route path="/ai-assistant" component={AIAssistant} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/whatsapp" component={WhatsAppPage} />
        <Route path="/bookings" component={BookingsPage} />
        <Route path="/zapier" component={ZapierPage} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <I18nProvider>
          <ThemeProvider>
            <TooltipProvider>
              <SettingsProvider>
                <AuthProvider>
                  <ProtectedRoutes />
                  <Toaster />
                </AuthProvider>
              </SettingsProvider>
            </TooltipProvider>
          </ThemeProvider>
        </I18nProvider>
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;

