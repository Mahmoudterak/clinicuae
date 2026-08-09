import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LogOut, Calendar, Receipt, User, Clock, FileText, AlertCircle, Phone, Mail, Droplet, Stethoscope } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { arSA } from 'date-fns/locale';

interface PatientAuth {
  token: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
}

interface Appointment {
  id: string;
  date: string;
  time: string;
  durationMinutes: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  reason: string;
  notes: string;
  doctorId: string;
}

interface Invoice {
  id: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  description: string;
  issuedDate: string;
  dueDate: string;
  paidDate: string | null;
}

interface PatientData {
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    gender: string;
    dateOfBirth: string;
    bloodType: string;
    allergies: string;
    address: string;
    notes: string;
  };
  appointments: Appointment[];
  invoices: Invoice[];
}

export default function PatientPortal() {
  const [, setLocation] = useLocation();
  const [auth, setAuth] = useState<PatientAuth | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('patient-auth');
    if (!stored) {
      setLocation('/patient/login');
      return;
    }
    try {
      setAuth(JSON.parse(stored));
    } catch {
      localStorage.removeItem('patient-auth');
      setLocation('/patient/login');
    }
  }, [setLocation]);

  const { data, isLoading, error } = useQuery<PatientData>({
    queryKey: ['patient-me'],
    queryFn: async () => {
      if (!auth?.token) throw new Error('No token');
      const res = await fetch('/api/patient/me', {
        headers: {
          'Authorization': `Bearer ${auth.token}`,
        },
      });
      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('patient-auth');
          setLocation('/patient/login');
        }
        throw new Error('فشل في جلب البيانات');
      }
      return res.json();
    },
    enabled: !!auth?.token,
  });

  const handleLogout = () => {
    localStorage.removeItem('patient-auth');
    setLocation('/patient/login');
  };

  if (!auth) return null;

  const renderAppointmentStatus = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 px-2.5 py-0.5 rounded-full">قيد الانتظار</Badge>;
      case 'confirmed': return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 px-2.5 py-0.5 rounded-full">مؤكد</Badge>;
      case 'completed': return <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200 px-2.5 py-0.5 rounded-full">مكتمل</Badge>;
      case 'cancelled': return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 px-2.5 py-0.5 rounded-full">ملغي</Badge>;
      default: return <Badge className="px-2.5 py-0.5 rounded-full">{status}</Badge>;
    }
  };

  const renderInvoiceStatus = (status: string) => {
    switch (status) {
      case 'paid': return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 px-2.5 py-0.5 rounded-full">مدفوعة</Badge>;
      case 'pending': return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 px-2.5 py-0.5 rounded-full">معلقة</Badge>;
      case 'overdue': return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 px-2.5 py-0.5 rounded-full">متأخرة</Badge>;
      default: return <Badge className="px-2.5 py-0.5 rounded-full">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div dir="rtl" className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="text-slate-500 font-medium">جاري تحميل بياناتك...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div dir="rtl" className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-red-100 shadow-sm">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">تعذر تحميل البيانات</h2>
            <p className="text-slate-600 mb-8">حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة مرة أخرى.</p>
            <Button onClick={handleLogout} variant="outline" className="w-full h-11">
              العودة لتسجيل الدخول
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { patient, appointments, invoices } = data;
  
  const sortedAppointments = [...appointments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + Number(i.amount), 0);
  const totalOutstanding = invoices.filter(i => i.status !== 'paid').reduce((sum, i) => sum + Number(i.amount), 0);

  return (
    <div dir="rtl" className="min-h-screen bg-[#F8FAFC] font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white w-9 h-9 rounded-lg flex items-center justify-center font-bold shadow-sm">
              OS
            </div>
            <div>
              <h1 className="font-bold text-slate-900 leading-tight">مرحباً، {patient.firstName}</h1>
              <p className="text-[11px] text-slate-500 font-medium tracking-wide">بوابة المريض</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-500 hover:text-red-600 hover:bg-red-50">
            <LogOut className="w-4 h-4 ml-2" />
            خروج
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <Tabs defaultValue="appointments" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-8 bg-slate-200/50 p-1.5 rounded-xl h-auto">
            <TabsTrigger value="appointments" className="py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm font-medium transition-all">
              <Calendar className="w-4 h-4 ml-2" />
              مواعيدي
            </TabsTrigger>
            <TabsTrigger value="invoices" className="py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm font-medium transition-all">
              <Receipt className="w-4 h-4 ml-2" />
              فواتيري
            </TabsTrigger>
            <TabsTrigger value="profile" className="py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm font-medium transition-all">
              <User className="w-4 h-4 ml-2" />
              ملفي
            </TabsTrigger>
          </TabsList>

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <TabsContent value="appointments" className="space-y-4 focus:outline-none m-0">
              {sortedAppointments.length === 0 ? (
                <Card className="border-dashed border-2 bg-slate-50/50 shadow-none">
                  <CardContent className="flex flex-col items-center justify-center py-16 text-slate-500">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                      <Calendar className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="font-medium text-slate-600">لا توجد مواعيد حالية</p>
                    <p className="text-sm text-slate-400 mt-1">لحجز موعد، يرجى التواصل مع العيادة</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {sortedAppointments.map((apt) => (
                    <Card key={apt.id} className="overflow-hidden hover:shadow-md transition-all border-slate-200/60 bg-white">
                      <CardContent className="p-0">
                        <div className="p-5 border-b border-slate-100/80 flex justify-between items-start">
                          <div>
                            <div className="flex items-center text-slate-900 font-bold mb-1.5">
                              <Calendar className="w-4 h-4 ml-2 text-indigo-500" />
                              {format(parseISO(apt.date), 'EEEE، d MMMM yyyy', { locale: arSA })}
                            </div>
                            <div className="flex items-center text-sm font-medium text-slate-500 bg-slate-100 w-fit px-2.5 py-1 rounded-md">
                              <Clock className="w-3.5 h-3.5 ml-1.5" />
                              {apt.time} 
                              <span className="mx-2 text-slate-300">•</span> 
                              {apt.durationMinutes} دقيقة
                            </div>
                          </div>
                          {renderAppointmentStatus(apt.status)}
                        </div>
                        <div className="p-5 bg-slate-50/50 flex items-start gap-3">
                          <Stethoscope className="w-5 h-5 text-indigo-400/70 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-semibold text-slate-700">{apt.reason || 'مراجعة عامة'}</p>
                            {apt.notes && <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{apt.notes}</p>}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="invoices" className="space-y-6 focus:outline-none m-0">
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-emerald-500 border-emerald-600 text-white shadow-sm">
                  <CardContent className="p-6">
                    <p className="text-emerald-100 text-sm font-medium mb-1">إجمالي المدفوعات</p>
                    <p className="text-3xl font-bold tracking-tight">{totalPaid.toLocaleString()} <span className="text-lg font-medium opacity-80">د.إ</span></p>
                  </CardContent>
                </Card>
                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardContent className="p-6">
                    <p className="text-slate-500 text-sm font-medium mb-1">المبلغ المستحق</p>
                    <p className="text-3xl font-bold text-slate-900 tracking-tight">{totalOutstanding.toLocaleString()} <span className="text-lg font-medium text-slate-400">د.إ</span></p>
                  </CardContent>
                </Card>
              </div>

              {invoices.length === 0 ? (
                <Card className="border-dashed border-2 bg-slate-50/50 shadow-none">
                  <CardContent className="flex flex-col items-center justify-center py-16 text-slate-500">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                      <Receipt className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="font-medium text-slate-600">لا توجد فواتير</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {invoices.map((inv) => (
                    <Card key={inv.id} className="border-slate-200/60 overflow-hidden hover:shadow-md transition-all">
                      <CardContent className="p-0 flex flex-col sm:flex-row">
                        <div className="p-5 flex-1 border-b sm:border-b-0 sm:border-l border-slate-100">
                          <div className="flex justify-between items-start mb-3">
                            <h3 className="font-bold text-slate-900 text-lg">{inv.description || 'فاتورة خدمات طبية'}</h3>
                            {renderInvoiceStatus(inv.status)}
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                            <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-md">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>الإصدار: {format(parseISO(inv.issuedDate), 'dd/MM/yyyy')}</span>
                            </div>
                            {inv.dueDate && (
                              <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-md">
                                <Clock className="w-3.5 h-3.5" />
                                <span>الاستحقاق: {format(parseISO(inv.dueDate), 'dd/MM/yyyy')}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="p-6 bg-slate-50/50 sm:w-56 flex sm:flex-col items-center sm:justify-center justify-between">
                          <span className="text-sm font-medium text-slate-500 sm:mb-1">قيمة الفاتورة</span>
                          <span className="text-2xl font-bold text-indigo-900">{Number(inv.amount).toLocaleString()} <span className="text-base font-medium text-indigo-400">د.إ</span></span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="profile" className="focus:outline-none m-0">
              <Card className="border-slate-200/60 shadow-sm overflow-hidden">
                <CardHeader className="border-b border-slate-100 pb-6 bg-white">
                  <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                      <User className="w-4 h-4" />
                    </div>
                    البيانات الشخصية
                  </CardTitle>
                  <CardDescription className="text-sm mt-2">
                    هذه البيانات مسجلة في ملفك الطبي. للتعديل، يرجى التواصل مع موظف الاستقبال.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-slate-100">
                    <div className="p-6 space-y-6">
                      <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                          <User className="w-5 h-5 text-slate-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-500 mb-0.5">الاسم الكامل</p>
                          <p className="font-bold text-slate-900 text-lg">{patient.firstName} {patient.lastName}</p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                          <Phone className="w-5 h-5 text-slate-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-500 mb-0.5">رقم الجوال</p>
                          <p className="font-semibold text-slate-900" dir="ltr">{patient.phone}</p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                          <Mail className="w-5 h-5 text-slate-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-500 mb-0.5">البريد الإلكتروني</p>
                          <p className="font-semibold text-slate-900">{patient.email || '—'}</p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                          <Calendar className="w-5 h-5 text-slate-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-500 mb-0.5">تاريخ الميلاد</p>
                          <p className="font-semibold text-slate-900">
                            {patient.dateOfBirth ? format(parseISO(patient.dateOfBirth), 'dd/MM/yyyy') : '—'}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-6 space-y-6 bg-slate-50/50">
                      <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                          <User className="w-5 h-5 text-indigo-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-500 mb-0.5">الجنس</p>
                          <p className="font-semibold text-slate-900">
                            {patient.gender === 'male' ? 'ذكر' : patient.gender === 'female' ? 'أنثى' : '—'}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                          <Droplet className="w-5 h-5 text-red-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-500 mb-0.5">فصيلة الدم</p>
                          <p className="font-bold text-red-600 text-lg" dir="ltr">{patient.bloodType || '—'}</p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                          <AlertCircle className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-500 mb-0.5">الحساسية</p>
                          <p className="font-semibold text-slate-900">{patient.allergies || 'لا توجد سجلات'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  );
}
