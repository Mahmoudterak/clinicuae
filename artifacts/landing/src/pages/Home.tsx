import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Mic, MessageCircle, Pill, BrainCircuit, Calendar, Wallet,
  BarChart3, Package, ArrowLeft, CheckCircle2, Stethoscope, Zap,
  Star, ChevronDown, Users, TrendingUp, Shield, Clock,
} from 'lucide-react';
import React, { useState } from 'react';
import { Link } from 'wouter';

// ── data ──────────────────────────────────────────────────────────────────────
const features = [
  { icon: BrainCircuit,   title: 'ملف المريض الذكي',           desc: 'سجل طبي وإداري شامل مع مساعد ذكاء اصطناعي داخل كل ملف.',                  enLabel: 'Intelligent EMR' },
  { icon: Calendar,       title: 'الحجز الإلكتروني',            desc: 'صفحة حجز مخصصة للمرضى وإدارة كاملة من لوحة التحكم.',                      enLabel: 'Online Booking' },
  { icon: MessageCircle,  title: 'تكامل واتساب المتقدم',       desc: 'إرسال رسائل تلقائية، تذكيرات، وفواتير مباشرةً للمرضى عبر واتساب.',         enLabel: 'WhatsApp Sync' },
  { icon: Wallet,         title: 'الحسابات والفواتير',          desc: 'إصدار فواتير، تتبع المدفوعات، وتصدير PDF باحترافية.',                       enLabel: 'Finance & Billing' },
  { icon: BarChart3,      title: 'التقارير والتحليلات',         desc: 'مؤشرات أداء، إيرادات، وإحصاءات مرضى بتقارير قابلة للتصدير.',               enLabel: 'Reports & Analytics' },
  { icon: Zap,            title: 'تكامل Zapier',                desc: 'ربط Clinic OS بآلاف التطبيقات تلقائياً — Google Sheets، Slack، وأكثر.',    enLabel: 'Zapier Integration' },
  { icon: Package,        title: 'إدارة المخزون',               desc: 'متابعة المواد الطبية، الاستهلاك، والمبيعات بدقة.',                           enLabel: 'Inventory' },
  { icon: Mic,            title: 'الإدخال الصوتي',              desc: 'إدخال بيانات بسرعة عبر الصوت واللهجة العامية.',                             enLabel: 'Voice Input' },
  { icon: Pill,           title: 'الروشتة الإلكترونية',         desc: 'وصف الأدوية بدقة وسرعة مع قاعدة بيانات أدوية متكاملة.',                    enLabel: 'e-Prescription' },
];

const plans = [
  {
    name: 'البداية',
    nameEn: 'Starter',
    price: 299,
    priceAnnual: 249,
    color: 'from-slate-700 to-slate-900',
    highlight: false,
    description: 'مثالية للعيادة ذات الطبيب الواحد',
    features: [
      'طبيب واحد',
      'إدارة المرضى والمواعيد',
      'الفواتير والمدفوعات',
      'الحجز الإلكتروني',
      'تقارير أساسية',
      'دعم فني عبر البريد',
    ],
    cta: 'ابدأ مجاناً',
  },
  {
    name: 'الاحترافية',
    nameEn: 'Pro',
    price: 699,
    priceAnnual: 579,
    color: 'from-indigo-600 to-violet-600',
    highlight: true,
    badge: 'الأكثر شيوعاً',
    description: 'للعيادات المتنامية التي تريد أتمتة كاملة',
    features: [
      'حتى 5 أطباء',
      'جميع ميزات الباقة الأساسية',
      'تكامل واتساب الأعمال',
      'تكامل Zapier',
      'إدارة المخزون',
      'تصدير PDF',
      'تقارير متقدمة',
      'دعم ذو أولوية',
    ],
    cta: 'ابدأ مجاناً',
  },
  {
    name: 'المركز الطبي',
    nameEn: 'Medical Center',
    price: 1799,
    priceAnnual: 1499,
    color: 'from-violet-700 to-purple-900',
    highlight: false,
    description: 'للمراكز الطبية والعيادات المتعددة',
    features: [
      'أطباء غير محدودين',
      'جميع ميزات الاحترافية',
      'فروع وعيادات متعددة',
      'تخصيص كامل للنظام',
      'مدير حساب مخصص',
      'دعم على مدار الساعة',
      'تكامل مع أنظمة خارجية',
      'تقارير مخصصة',
    ],
    cta: 'تواصل معنا',
  },
];

const stats = [
  { icon: Users,    value: '+500',   label: 'عيادة تستخدم النظام' },
  { icon: Star,     value: '4.9',    label: 'تقييم المستخدمين' },
  { icon: TrendingUp, value: '40%', label: 'توفير في وقت الإدارة' },
  { icon: Shield,   value: '99.9%',  label: 'وقت التشغيل' },
];

// ── App screenshot mockups ─────────────────────────────────────────────────────
const screens = [
  {
    label: 'لوحة التحكم',
    labelEn: 'Dashboard',
    content: (
      <div className="flex h-full bg-slate-950 text-slate-300 text-xs overflow-hidden">
        {/* Sidebar */}
        <div className="w-44 bg-slate-900 border-l border-white/5 p-3 shrink-0">
          <div className="flex items-center gap-2 mb-6 p-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-500 flex items-center justify-center"><Stethoscope className="w-3 h-3 text-white" /></div>
            <span className="font-bold text-white text-xs">Clinic OS</span>
          </div>
          {['لوحة التحكم','المرضى','المواعيد','الفواتير','التقارير','واتساب','Zapier','الإعدادات'].map((item,i) => (
            <div key={i} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg mb-1 ${i===0 ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:bg-white/5'}`}>
              <div className="w-3 h-3 rounded bg-white/10 shrink-0" />
              <span className="truncate">{item}</span>
            </div>
          ))}
        </div>
        {/* Main */}
        <div className="flex-1 p-4 overflow-hidden flex flex-col gap-3">
          <div className="text-white font-bold text-sm mb-1">مرحباً، د. محمد 👋</div>
          {/* KPI cards */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'مرضى اليوم', val: '24', color: 'text-blue-400' },
              { label: 'المواعيد', val: '18', color: 'text-indigo-400' },
              { label: 'الإيرادات', val: '12,400', color: 'text-green-400' },
              { label: 'فواتير معلقة', val: '6', color: 'text-yellow-400' },
            ].map((k,i) => (
              <div key={i} className="bg-white/5 border border-white/5 rounded-xl p-3">
                <div className={`text-lg font-bold ${k.color}`}>{k.val}</div>
                <div className="text-slate-500 text-[10px] mt-0.5">{k.label}</div>
              </div>
            ))}
          </div>
          {/* Chart */}
          <div className="flex-1 bg-white/5 border border-white/5 rounded-xl p-3 relative overflow-hidden">
            <div className="text-white/60 text-[10px] mb-3">إيرادات الأسبوع (درهم)</div>
            <div className="flex items-end gap-1 h-24">
              {[35,55,45,80,60,95,75].map((h,i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t-sm bg-indigo-500/50" style={{height:`${h}%`}} />
                  <span className="text-[8px] text-slate-500">{['أح','إث','ثل','أر','خم','جم','سب'][i]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    label: 'المرضى',
    labelEn: 'Patients',
    content: (
      <div className="flex h-full bg-slate-50 text-slate-700 text-xs overflow-hidden flex-col">
        <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between shrink-0">
          <span className="font-bold text-slate-900">قائمة المرضى</span>
          <div className="flex gap-2">
            <div className="bg-slate-100 rounded-lg px-3 py-1.5 text-slate-500 text-[10px]">🔍 بحث...</div>
            <div className="bg-indigo-600 rounded-lg px-3 py-1.5 text-white text-[10px]">+ مريض جديد</div>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          {[
            { name: 'أحمد العتيبي',   age: '34', spec: 'طب عام',     status: 'نشط',   color: 'bg-green-100 text-green-700' },
            { name: 'سارة المنصوري',  age: '28', spec: 'أمراض جلدية', status: 'نشط',   color: 'bg-green-100 text-green-700' },
            { name: 'خالد الزهراني', age: '52', spec: 'قلب وأوعية',  status: 'متابعة', color: 'bg-yellow-100 text-yellow-700' },
            { name: 'فاطمة الحربي',  age: '41', spec: 'طب عام',     status: 'نشط',   color: 'bg-green-100 text-green-700' },
            { name: 'محمد القحطاني', age: '29', spec: 'عظام',        status: 'جديد',  color: 'bg-blue-100 text-blue-700' },
          ].map((p,i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-3 border-b border-slate-50 ${i%2===0?'bg-white':'bg-slate-50/50'}`}>
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0">{p.name[0]}</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-900 truncate">{p.name}</div>
                <div className="text-slate-400 text-[10px]">{p.age} سنة · {p.spec}</div>
              </div>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${p.color}`}>{p.status}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    label: 'الفواتير',
    labelEn: 'Invoices',
    content: (
      <div className="flex h-full bg-slate-50 text-slate-700 text-xs overflow-hidden flex-col">
        <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between shrink-0">
          <span className="font-bold text-slate-900">الفواتير</span>
          <div className="flex gap-2">
            <div className="bg-slate-100 rounded-lg px-2 py-1 text-[10px] text-slate-500">كل الفواتير ▾</div>
            <div className="bg-indigo-600 rounded-lg px-2 py-1 text-white text-[10px]">+ فاتورة جديدة</div>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          {[
            { name: 'أحمد العتيبي',   amount: '350',  status: 'مدفوع',    color: 'bg-green-100 text-green-700',  wa: true },
            { name: 'سارة المنصوري',  amount: '650',  status: 'معلق',     color: 'bg-yellow-100 text-yellow-700', wa: false },
            { name: 'خالد الزهراني', amount: '1,200', status: 'مدفوع',    color: 'bg-green-100 text-green-700',  wa: true },
            { name: 'فاطمة الحربي',  amount: '450',  status: 'متأخر',    color: 'bg-red-100 text-red-700',      wa: false },
            { name: 'محمد القحطاني', amount: '250',  status: 'معلق',     color: 'bg-yellow-100 text-yellow-700', wa: false },
          ].map((inv,i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-3 border-b border-slate-50 ${i%2===0?'bg-white':'bg-slate-50/50'}`}>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-900 truncate">{inv.name}</div>
                <div className="text-slate-400 text-[10px]">INV-{1000+i}</div>
              </div>
              <div className="font-bold text-slate-900">{inv.amount} <span className="font-normal text-slate-400">د.إ</span></div>
              {inv.wa && <span className="text-[10px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full">✓ WA</span>}
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${inv.color}`}>{inv.status}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    label: 'واتساب',
    labelEn: 'WhatsApp',
    content: (
      <div className="flex h-full bg-slate-50 flex-col text-xs overflow-hidden">
        <div className="bg-white border-b border-slate-100 px-4 py-3 shrink-0">
          <span className="font-bold text-slate-900">واتساب الأعمال</span>
        </div>
        <div className="flex flex-col gap-2 p-3 overflow-hidden">
          {/* Template cards */}
          {[
            { title: 'تذكير موعد',        desc: 'تذكير تلقائي قبل الموعد بـ 24 ساعة', color: 'border-l-4 border-indigo-400' },
            { title: 'إرسال الفاتورة',    desc: 'إرسال ملخص الفاتورة للمريض مباشرةً', color: 'border-l-4 border-green-400' },
            { title: 'رسالة ترحيب',       desc: 'استقبال المرضى الجدد تلقائياً',       color: 'border-l-4 border-blue-400' },
            { title: 'متابعة بعد الزيارة', desc: 'تواصل مع المريض بعد الكشف',           color: 'border-l-4 border-violet-400' },
          ].map((t,i) => (
            <div key={i} className={`bg-white rounded-xl p-3 ${t.color} shadow-sm flex items-start justify-between`}>
              <div>
                <div className="font-semibold text-slate-900">{t.title}</div>
                <div className="text-slate-400 text-[10px] mt-0.5">{t.desc}</div>
              </div>
              <div className="bg-indigo-50 text-indigo-600 text-[10px] px-2 py-1 rounded-lg font-medium shrink-0 ml-2">إرسال</div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

// ── components ────────────────────────────────────────────────────────────────
function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-white/10">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Stethoscope className="w-6 h-6" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">Clinic OS</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <a href="#features" className="hover:text-white transition-colors">المميزات</a>
          <a href="#screenshots" className="hover:text-white transition-colors">النظام</a>
          <a href="#pricing" className="hover:text-white transition-colors">الباقات</a>
        </nav>
        <div className="flex items-center gap-3">
          <Button variant="ghost" className="hidden sm:inline-flex text-slate-300 hover:text-white hover:bg-white/10">
            تسجيل الدخول
          </Button>
          <Link href="/trial">
            <Button className="bg-indigo-500 hover:bg-indigo-600 text-white border-0 rounded-xl">
              ابدأ مجاناً
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative pt-40 pb-20 md:pt-52 md:pb-28 overflow-hidden bg-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-950 to-slate-950" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-[128px]" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[128px]" />

      <div className="container relative mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-indigo-300 text-sm font-medium mb-8"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
          </span>
          نظام إدارة عيادات متكامل مصمم للسوق العربي
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
          className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight"
        >
          الجيل الجديد من <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-l from-indigo-400 to-purple-400">
            إدارة العيادات
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg md:text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed"
        >
          إدارة العيادة، المرضى، الفواتير، واتساب، وZapier — في نظام واحد سريع ومصمم للأطباء والإداريين في دول الخليج.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link href="/trial">
            <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-lg bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl shadow-[0_0_40px_-10px_rgba(99,102,241,0.5)] border-0">
              ابدأ تجربتك المجانية
              <ArrowLeft className="w-5 h-5 mr-2" />
            </Button>
          </Link>
          <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 text-lg bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-xl">
            شاهد العرض التوضيحي
          </Button>
        </motion.div>
      </div>
    </section>
  );
}

function Stats() {
  return (
    <section className="bg-slate-900 border-y border-white/5 py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <div className="flex justify-center mb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                  <s.icon className="w-5 h-5 text-indigo-400" />
                </div>
              </div>
              <div className="text-3xl font-black text-white mb-1">{s.value}</div>
              <div className="text-sm text-slate-400">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Screenshots() {
  const [active, setActive] = useState(0);
  return (
    <section className="py-24 bg-slate-950" id="screenshots">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <motion.h2
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-3xl md:text-5xl font-black text-white mb-4"
          >
            النظام من الداخل
          </motion.h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">واجهة سلسة وسريعة مصممة خصيصاً للعيادات العربية</p>
        </div>

        {/* Tab buttons */}
        <div className="flex justify-center flex-wrap gap-2 mb-8">
          {screens.map((s, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                active === i
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-white/10'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Screen preview */}
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="max-w-4xl mx-auto"
        >
          <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-indigo-900/20">
            {/* Browser chrome */}
            <div className="h-9 bg-slate-900 border-b border-white/5 flex items-center px-4 gap-2">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/40" />
              </div>
              <div className="mx-auto text-[11px] text-slate-500 font-mono">app.clinic-os.com / {screens[active].labelEn.toLowerCase()}</div>
            </div>
            <div className="h-[420px] md:h-[500px]">
              {screens[active].content}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section className="py-24 bg-white" id="features">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-3xl md:text-5xl font-black text-slate-900 mb-4"
          >
            كل ما تحتاجه في مكان واحد
          </motion.h2>
          <p className="text-lg text-slate-500">نظام متكامل يغطي كل جانب من جوانب إدارة العيادة</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all duration-300 group"
            >
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{feature.title}</h3>
              <p className="text-slate-500 leading-relaxed text-sm mb-3">{feature.desc}</p>
              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">{feature.enLabel}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const [annual, setAnnual] = useState(false);
  return (
    <section className="py-24 bg-slate-50" id="pricing">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <motion.h2
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-3xl md:text-5xl font-black text-slate-900 mb-4"
          >
            أسعار شفافة وبسيطة
          </motion.h2>
          <p className="text-slate-500 text-lg mb-8">ابدأ مجاناً لمدة 14 يوماً — بدون بطاقة ائتمان</p>

          {/* Annual/Monthly toggle */}
          <div className="inline-flex items-center gap-3 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm">
            <button
              onClick={() => setAnnual(false)}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${!annual ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              شهري
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${annual ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              سنوي
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${annual ? 'bg-white/20 text-white' : 'bg-green-100 text-green-700'}`}>
                وفّر 15%
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`relative rounded-3xl overflow-hidden ${plan.highlight ? 'shadow-2xl shadow-indigo-500/20 scale-105' : 'shadow-sm'}`}
            >
              {plan.badge && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
                  <span className="bg-white text-indigo-600 text-xs font-bold px-3 py-1 rounded-full shadow-sm">{plan.badge}</span>
                </div>
              )}
              {/* Header */}
              <div className={`bg-gradient-to-br ${plan.color} p-6 pt-10 text-white`}>
                <div className="text-lg font-bold mb-1">{plan.name}</div>
                <div className="text-white/60 text-xs mb-4">{plan.nameEn} · {plan.description}</div>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-black">{annual ? plan.priceAnnual : plan.price}</span>
                  <span className="text-white/60 mb-1 text-sm">د.إ / شهر</span>
                </div>
                {annual && (
                  <div className="text-white/50 text-xs mt-1">يُدفع {(plan.priceAnnual * 12).toLocaleString()} د.إ سنوياً</div>
                )}
              </div>
              {/* Features */}
              <div className="bg-white p-6 flex flex-col gap-5">
                <ul className="space-y-3">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2.5 text-sm text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href={plan.cta === 'تواصل معنا' ? 'https://wa.me/971551981564' : '/trial'} className="block" target={plan.cta === 'تواصل معنا' ? '_blank' : undefined}>
                  <Button
                    className={`w-full rounded-xl h-11 font-semibold ${
                      plan.highlight
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                    }`}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Comparison note */}
        <p className="text-center text-sm text-slate-400 mt-10">
          <Clock className="inline w-4 h-4 ml-1" />
          جميع الباقات تشمل التحديثات التلقائية، النسخ الاحتياطي اليومي، وبروتوكول HTTPS المشفر
        </p>
      </div>
    </section>
  );
}

const plans = [
  {
    name: 'Basic',
    nameAr: 'الأساسية',
    price: '299',
    period: 'شهرياً',
    desc: 'مثالية للعيادات الفردية والناشئة',
    highlight: false,
    features: [
      'طبيب واحد',
      'حتى 200 مريض',
      'ملف المريض الإلكتروني',
      'الحجز الإلكتروني',
      'إدارة الفواتير',
      'دعم فني عبر البريد',
    ],
    cta: 'ابدأ مجاناً',
  },
  {
    name: 'Pro',
    nameAr: 'الاحترافية',
    price: '699',
    period: 'شهرياً',
    desc: 'للعيادات المتنامية التي تحتاج إلى أتمتة متقدمة',
    highlight: true,
    features: [
      'حتى 5 أطباء',
      'مرضى غير محدودين',
      'كل مزايا الباقة الأساسية',
      'تكامل واتساب الكامل',
      'الروشتة الإلكترونية الذكية',
      'التقارير والتحليلات',
      'إدارة المخزون',
      'دعم فني ذو أولوية',
    ],
    cta: 'ابدأ تجربتك المجانية',
  },
  {
    name: 'Enterprise',
    nameAr: 'المؤسسية',
    price: 'تواصل معنا',
    period: '',
    desc: 'حلول مخصصة للمجمعات الطبية والسلاسل الكبيرة',
    highlight: false,
    features: [
      'أطباء غير محدودين',
      'فروع متعددة',
      'كل مزايا الباقة الاحترافية',
      'تكامل Zapier المتقدم',
      'تقارير مخصصة',
      'مدير حساب مخصص',
      'اتفاقية مستوى الخدمة (SLA)',
      'إعداد وتدريب كامل',
    ],
    cta: 'تواصل مع فريق المبيعات',
  },
];

function CTA() {
  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-3xl p-8 md:p-16 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-[80px]" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-900/50 rounded-full blur-[80px]" />
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-4">
              هل أنت مستعد؟
            </h2>
            <p className="text-lg text-indigo-100 mb-8">
              انضم لمئات الأطباء الذين يديرون عياداتهم بذكاء مع Clinic OS.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/trial">
                <Button size="lg" className="h-14 px-8 text-lg bg-white text-indigo-600 hover:bg-slate-50 border-0 rounded-xl">
                  ابدأ تجربتك المجانية — 14 يوم
                </Button>
              </Link>
              <a href="https://wa.me/971551981564" target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-white/20 text-white hover:bg-white/10 rounded-xl">
                  تواصل مع المبيعات
                </Button>
              </a>
            </div>
            <div className="mt-6 flex items-center justify-center gap-6 text-sm text-indigo-200 flex-wrap">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> بدون بطاقة ائتمان</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> إعداد في 5 دقائق</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> إلغاء في أي وقت</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-400 py-12 border-t border-white/5">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 text-white">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
              <Stethoscope className="w-5 h-5" />
            </div>
            <span className="text-lg font-bold">Clinic OS</span>
          </div>
          <div className="flex items-center gap-6 text-sm font-medium flex-wrap justify-center">
            <a href="#features" className="hover:text-white transition-colors">المميزات</a>
            <a href="#screenshots" className="hover:text-white transition-colors">النظام</a>
            <a href="#pricing" className="hover:text-white transition-colors">الأسعار</a>
            <a href="https://wa.me/971551981564" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">تواصل معنا</a>
          </div>
          <div className="text-sm">&copy; {new Date().getFullYear()} Clinic OS. جميع الحقوق محفوظة.</div>
        </div>
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 selection:bg-indigo-100 selection:text-indigo-900">
      <Navbar />
      <main>
        <Hero />
        <Stats />
        <Screenshots />
        <Features />
        <Pricing />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
