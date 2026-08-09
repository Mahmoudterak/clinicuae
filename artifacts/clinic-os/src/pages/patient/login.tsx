import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function PatientLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch('/api/patient-auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, pin }),
      });
      if (!res.ok) throw new Error('بيانات الدخول غير صحيحة');
      const data = await res.json();
      localStorage.setItem('patient-auth', JSON.stringify(data));
      setLocation('/patient/portal');
    } catch (err: any) {
      toast({
        title: 'خطأ في تسجيل الدخول',
        description: err.message || 'تأكد من رقم الجوال ورمز الدخول',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans text-slate-100">
      <Card className="w-full max-w-md bg-slate-800 border-slate-700 text-slate-100 shadow-2xl">
        <CardHeader className="space-y-3 text-center pt-8">
          <div className="mx-auto bg-indigo-600 text-white w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold mb-4 shadow-lg shadow-indigo-500/20">
            OS
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">بوابة المريض</CardTitle>
          <CardDescription className="text-slate-400 text-base">سجّل دخولك لعرض مواعيدك وفواتيرك</CardDescription>
        </CardHeader>
        <CardContent className="pb-8">
          <form onSubmit={handleLogin} className="space-y-6 mt-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-slate-300">رقم الجوال</Label>
              <Input 
                id="phone" 
                type="tel" 
                dir="ltr" 
                placeholder="+966 50 000 0000" 
                value={phone} 
                onChange={e => setPhone(e.target.value)}
                className="bg-slate-900/50 border-slate-700 text-slate-100 h-12 px-4 focus-visible:ring-indigo-500"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pin" className="text-slate-300">رمز الدخول (PIN)</Label>
              <Input 
                id="pin" 
                type="password" 
                maxLength={6}
                dir="ltr"
                placeholder="••••••" 
                value={pin} 
                onChange={e => setPin(e.target.value)}
                className="bg-slate-900/50 border-slate-700 text-slate-100 h-12 tracking-[0.5em] text-center text-xl focus-visible:ring-indigo-500"
                required
              />
            </div>
            <Button type="submit" className="w-full h-12 text-base font-medium bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 transition-all mt-4" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'تسجيل الدخول'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center border-t border-slate-700/50 py-5 bg-slate-800/50 rounded-b-xl">
          <p className="text-sm text-slate-400 text-center">
            رقم الجوال ورمز PIN يوفّرهما موظف الاستقبال في العيادة
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
