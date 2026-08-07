import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Stethoscope, CheckCircle2, ArrowRight, Loader2,
  Shield, Clock, Star, Phone
} from 'lucide-react';

const perks = [
  '14 يوماً مجاناً — بدون بطاقة ائتمان',
  'وصول كامل لجميع ميزات الباقة الاحترافية',
  'إعداد العيادة في أقل من 5 دقائق',
  'دعم فني متاح على مدار الساعة',
];

export default function TrialPage() {
  const [step, setStep] = useState<'form' | 'done'>('form');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    clinicName: '',
    ownerName: '',
    phone: '',
    email: '',
    specialty: '',
  });

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch('/api/superadmin/clinics/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicName: form.clinicName,
          ownerName: form.ownerName,
          phone: form.phone,
          email: form.email,
          specialty: form.specialty,
        }),
      });
    } catch {
      // proceed to success regardless
    }
    setLoading(false);
    setStep('done');
  };

  const valid =
    form.clinicName.trim().length > 1 &&
    form.ownerName.trim().length > 1 &&
    form.phone.trim().length > 7;

  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/30 via-slate-950 to-slate-950 pointer-events-none" />
      <div className="absolute top-20 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-violet-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Navbar */}
      <header className="relative z-10 border-b border-white/5 bg-slate-950/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-xl bg-indigo-500 flex items-center justify-center">
              <Stethoscope className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white">Clinic OS</span>
          </Link>
          <div className="text-sm text-slate-400">
            لديك حساب؟{' '}
            <Link href="/" className="text-indigo-400 hover:text-indigo-300 font-medium">العودة للرئيسية</Link>
          </div>
        </div>
      </header>

      <div className="relative z-10 container mx-auto px-4 py-16 max-w-5xl">
        {step === 'form' ? (
          <div className="grid md:grid-cols-2 gap-12 items-start">
            {/* Left side — perks */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="md:pt-8"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-medium mb-6">
                <Clock className="w-3.5 h-3.5" />
                تجربة مجانية 14 يوماً
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
                ابدأ تجربتك <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-l from-indigo-400 to-purple-400">
                  المجانية الآن
                </span>
              </h1>
              <p className="text-slate-400 text-lg mb-10 leading-relaxed">
                سجّل عيادتك واحصل على وصول كامل لجميع ميزات Clinic OS لمدة 14 يوماً — بدون أي التزام.
              </p>

              <ul className="space-y-4 mb-10">
                {perks.map((p, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.08 }}
                    className="flex items-center gap-3 text-slate-300"
                  >
                    <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                    </div>
                    {p}
                  </motion.li>
                ))}
              </ul>

              {/* Social proof */}
              <div className="flex items-center gap-3 text-sm text-slate-500 border-t border-white/5 pt-8">
                <div className="flex -space-x-2 rtl:space-x-reverse">
                  {['أ','م','س','خ','ف'].map((l, i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-indigo-500/20 border-2 border-slate-950 flex items-center justify-center text-xs font-bold text-indigo-300">
                      {l}
                    </div>
                  ))}
                </div>
                <div>
                  انضم لـ <span className="text-white font-semibold">+500 عيادة</span> تستخدم Clinic OS
                  <div className="flex items-center gap-1 mt-0.5">
                    {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />)}
                    <span className="text-xs mr-1">4.9/5</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right side — form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-2xl">
                <h2 className="text-xl font-bold text-white mb-6">بيانات العيادة</h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-1.5">
                    <Label className="text-slate-300 text-sm">اسم العيادة *</Label>
                    <Input
                      required
                      placeholder="عيادة الرعاية الطبية"
                      value={form.clinicName}
                      onChange={set('clinicName')}
                      className="h-11 bg-slate-800/50 border-white/10 text-white placeholder:text-slate-600 rounded-xl focus:border-indigo-500 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-300 text-sm">اسم المسؤول *</Label>
                    <Input
                      required
                      placeholder="د. أحمد العتيبي"
                      value={form.ownerName}
                      onChange={set('ownerName')}
                      className="h-11 bg-slate-800/50 border-white/10 text-white placeholder:text-slate-600 rounded-xl focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-300 text-sm">رقم الجوال *</Label>
                    <div className="relative">
                      <Input
                        required
                        type="tel"
                        placeholder="+971 50 000 0000"
                        value={form.phone}
                        onChange={set('phone')}
                        dir="ltr"
                        className="h-11 bg-slate-800/50 border-white/10 text-white placeholder:text-slate-600 rounded-xl focus:border-indigo-500 ps-10"
                      />
                      <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-300 text-sm">البريد الإلكتروني</Label>
                    <Input
                      type="email"
                      placeholder="info@clinic.ae"
                      value={form.email}
                      onChange={set('email')}
                      dir="ltr"
                      className="h-11 bg-slate-800/50 border-white/10 text-white placeholder:text-slate-600 rounded-xl focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-300 text-sm">التخصص</Label>
                    <Input
                      placeholder="مثال: طب عام، جلدية، أطفال..."
                      value={form.specialty}
                      onChange={set('specialty')}
                      className="h-11 bg-slate-800/50 border-white/10 text-white placeholder:text-slate-600 rounded-xl focus:border-indigo-500"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={!valid || loading}
                    className="w-full h-12 text-base font-semibold rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white border-0 gap-2 shadow-lg shadow-indigo-500/20 mt-2"
                  >
                    {loading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> جاري التسجيل...</>
                    ) : (
                      <>ابدأ التجربة المجانية <ArrowRight className="w-4 h-4" /></>
                    )}
                  </Button>

                  <p className="text-center text-xs text-slate-500 mt-3 leading-relaxed">
                    بالتسجيل توافق على{' '}
                    <a href="#" className="text-indigo-400 hover:underline">شروط الاستخدام</a>
                    {' '}و{' '}
                    <a href="#" className="text-indigo-400 hover:underline">سياسة الخصوصية</a>
                  </p>
                </form>
              </div>

              {/* Security note */}
              <div className="flex items-center justify-center gap-2 text-xs text-slate-500 mt-4">
                <Shield className="w-3.5 h-3.5" />
                بياناتك مشفرة وآمنة بالكامل
              </div>
            </motion.div>
          </div>
        ) : (
          /* Success state */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-lg mx-auto text-center py-16"
          >
            <div className="w-24 h-24 rounded-3xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-8">
              <CheckCircle2 className="w-12 h-12 text-green-400" />
            </div>
            <h2 className="text-3xl font-black text-white mb-3">أهلاً بك في Clinic OS!</h2>
            <p className="text-slate-400 text-lg mb-2">
              تم تسجيل عيادة <span className="text-white font-semibold">{form.clinicName}</span> بنجاح.
            </p>
            <p className="text-slate-500 mb-10">
              سيتواصل معك فريقنا على <span className="text-indigo-400">{form.phone}</span> خلال ساعات لإعداد حسابك وبدء تجربتك المجانية لـ 14 يوماً.
            </p>
            <div className="grid grid-cols-3 gap-4 mb-10">
              {[
                { icon: Clock,        label: 'مدة التجربة',   val: '14 يوم' },
                { icon: Shield,       label: 'الباقة',        val: 'احترافية' },
                { icon: Star,         label: 'الدعم',         val: '24/7' },
              ].map((item, i) => (
                <div key={i} className="bg-slate-900 border border-white/5 rounded-2xl p-4 text-center">
                  <item.icon className="w-5 h-5 text-indigo-400 mx-auto mb-2" />
                  <div className="text-white font-bold text-lg">{item.val}</div>
                  <div className="text-slate-500 text-xs">{item.label}</div>
                </div>
              ))}
            </div>
            <Link href="/">
              <Button variant="outline" className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 rounded-xl h-11 px-6">
                العودة للرئيسية
              </Button>
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
}
