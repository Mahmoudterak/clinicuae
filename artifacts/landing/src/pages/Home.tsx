import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { 
  Mic, 
  MessageCircle, 
  Pill, 
  BrainCircuit, 
  Calendar, 
  Wallet, 
  BarChart3, 
  Package, 
  ArrowLeft, 
  CheckCircle2,
  Stethoscope,
  Zap
} from 'lucide-react';
import React from 'react';

const features = [
  {
    icon: Mic,
    title: 'الإدخال الصوتي والذكاء اللغوي',
    desc: 'إدخال البيانات بسهولة عبر الصوت أو الكتابة باللهجة العامية، مع فهم ذكي للأوامر.',
    enLabel: 'Voice & AI'
  },
  {
    icon: MessageCircle,
    title: 'تكامل واتساب المتقدم',
    desc: 'إرسال رسائل أوتوماتيكية وتفاعلية للمرضى، تذكيرات، وعروض.',
    enLabel: 'WhatsApp Sync'
  },
  {
    icon: Pill,
    title: 'الروشتة الإلكترونية الذكية',
    desc: 'نظام وصف دوائي بالذكاء الاصطناعي لتحسين الدقة والسرعة.',
    enLabel: 'Smart e-Prescription'
  },
  {
    icon: BrainCircuit,
    title: 'ملف المريض الذكي',
    desc: 'سجل طبي وإداري شامل يحتوي على مساعد ذكي.',
    enLabel: 'Intelligent EMR'
  },
  {
    icon: Calendar,
    title: 'الحجز الإلكتروني',
    desc: 'واجهة حجز مخصصة وقابلة للتحكم الكامل من داخل النظام.',
    enLabel: 'Online Booking'
  },
  {
    icon: Wallet,
    title: 'الحسابات والماليات',
    desc: 'وحدة مالية شاملة للرواتب، المصروفات، والإيرادات.',
    enLabel: 'Finance & Billing'
  },
  {
    icon: BarChart3,
    title: 'التقارير والتحليلات',
    desc: 'تقارير شاملة ومؤشرات أداء لقياس نمو العيادة.',
    enLabel: 'Reports & Analytics'
  },
  {
    icon: Package,
    title: 'إدارة المنتجات والمخزون',
    desc: 'نظام مخزون متكامل لمتابعة المواد الطبية والاستهلاك والمبيعات.',
    enLabel: 'Inventory Management'
  },
  {
    icon: Zap,
    title: 'تكامل Zapier',
    desc: 'ربط Clinic OS بآلاف التطبيقات تلقائياً — Google Sheets، Slack، البريد الإلكتروني، وأكثر — بدون كود.',
    enLabel: 'Zapier Integration'
  }
];

function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-white/10">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Stethoscope className="w-6 h-6" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">Clinic OS</span>
        </div>
        
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <a href="#features" className="hover:text-white transition-colors">المميزات</a>
          <a href="#showcase" className="hover:text-white transition-colors">النظام</a>
          <a href="#pricing" className="hover:text-white transition-colors">الباقات</a>
        </nav>

        <div className="flex items-center gap-4">
          <Button variant="ghost" className="hidden sm:inline-flex text-slate-300 hover:text-white hover:bg-white/10">
            تسجيل الدخول
          </Button>
          <Button className="bg-indigo-500 hover:bg-indigo-600 text-white border-0">
            ابدأ تجربتك المجانية
          </Button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative pt-40 pb-20 md:pt-52 md:pb-32 overflow-hidden bg-slate-950">
      {/* Background Gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-950 to-slate-950"></div>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-[128px]"></div>
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[128px]"></div>

      <div className="container relative mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-indigo-300 text-sm font-medium mb-8"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </span>
          يُقدَّم لكم <span className="font-bold text-white ml-1">Clinic OS</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight"
        >
          الجيل الجديد من <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-l from-indigo-400 to-purple-400">
            إدارة العيادات
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-xl md:text-2xl text-slate-300 mb-6 font-medium max-w-2xl mx-auto"
        >
          إدارة عيادتك أصبحت أسرع، أذكى، وأسهل
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-base md:text-lg text-slate-400 mb-10 max-w-3xl mx-auto leading-relaxed"
        >
          يجمع بين إدارة العيادة، الإدخال الصوتي، المساعد الذكي لملف المريض، وأتمتة واتساب في نظام واحد مصمم لتبسيط العمل اليومي للأطباء والإداريين.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-lg bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl shadow-[0_0_40px_-10px_rgba(99,102,241,0.5)] border-0">
            ابدأ تجربتك المجانية
            <ArrowLeft className="w-5 h-5 mr-2" />
          </Button>
          <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 text-lg bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-xl">
            شاهد العرض التوضيحي
          </Button>
        </motion.div>
      </div>
    </section>
  );
}

function DashboardMockup() {
  return (
    <section className="relative pb-24 bg-slate-950 px-4 mt-[-60px]" id="showcase">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="relative rounded-2xl overflow-hidden border border-white/10 bg-slate-900 shadow-2xl shadow-indigo-900/20 max-w-5xl mx-auto"
        >
          {/* Mac window header */}
          <div className="h-10 bg-slate-900 border-b border-white/5 flex items-center px-4 gap-2">
            <div className="w-3 h-3 rounded-full bg-slate-700"></div>
            <div className="w-3 h-3 rounded-full bg-slate-700"></div>
            <div className="w-3 h-3 rounded-full bg-slate-700"></div>
            <div className="mx-auto text-xs text-slate-500 font-medium">clinic-os.app</div>
          </div>
          {/* Dashboard Body */}
          <div className="flex h-[400px] md:h-[600px] bg-slate-950 text-slate-300">
            {/* Sidebar */}
            <div className="w-48 md:w-64 border-l border-white/5 bg-slate-900/50 p-4 hidden sm:block">
              <div className="h-8 w-24 bg-white/10 rounded mb-8"></div>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-10 w-full bg-white/5 rounded flex items-center px-3 gap-3">
                    <div className="w-5 h-5 rounded bg-white/10"></div>
                    <div className="h-3 w-16 bg-white/10 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
            {/* Main Content */}
            <div className="flex-1 p-6 overflow-hidden flex flex-col gap-6">
              {/* Top stats */}
              <div className="flex gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex-1 h-24 bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col justify-center">
                    <div className="h-3 w-12 bg-indigo-500/20 rounded mb-2"></div>
                    <div className="h-6 w-20 bg-white/10 rounded"></div>
                  </div>
                ))}
              </div>
              {/* Chart area */}
              <div className="flex-1 bg-white/5 border border-white/5 rounded-xl p-6 relative overflow-hidden">
                <div className="h-4 w-32 bg-white/10 rounded mb-6"></div>
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-indigo-500/20 to-transparent"></div>
                {/* Fake chart lines */}
                <div className="flex items-end h-full gap-2 px-4 pb-4">
                  {[40, 70, 45, 90, 65, 100, 80, 110, 85, 120].map((h, i) => (
                    <div key={i} className="flex-1 bg-indigo-500/40 rounded-t-sm" style={{ height: `${h}%` }}></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section className="py-24 bg-slate-50 relative" id="features">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-black text-slate-900 mb-6"
          >
            مميزات النظام
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg text-slate-600 font-medium"
          >
            اكتشف كيف يمكن لـ Clinic OS تحويل عيادتك إلى مؤسسة ذكية متكاملة
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all duration-300 group"
            >
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
              <p className="text-slate-600 leading-relaxed mb-4">{feature.desc}</p>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-inter">
                {feature.enLabel}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="bg-indigo-600 rounded-3xl p-8 md:p-16 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-[80px]"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-900/50 rounded-full blur-[80px]"></div>
          
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-6">
              هل أنت مستعد لنقل عيادتك إلى المستوى التالي؟
            </h2>
            <p className="text-lg text-indigo-100 mb-10">
              انضم إلى مئات الأطباء الذين اختاروا Clinic OS لتسهيل أعمالهم اليومية وتقديم رعاية أفضل لمرضاهم.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button size="lg" className="h-14 px-8 text-lg bg-white text-indigo-600 hover:bg-slate-50 border-0 rounded-xl">
                ابدأ تجربتك المجانية
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-white/20 text-white hover:bg-white/10 rounded-xl">
                تواصل مع المبيعات
              </Button>
            </div>
            
            <div className="mt-8 flex items-center justify-center gap-6 text-sm text-indigo-200">
              <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> لا حاجة لبطاقة ائتمان</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> إعداد في 5 دقائق</span>
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
          
          <div className="flex items-center gap-6 text-sm font-medium">
            <a href="#" className="hover:text-white transition-colors">عن النظام</a>
            <a href="#" className="hover:text-white transition-colors">المميزات</a>
            <a href="#" className="hover:text-white transition-colors">الأسعار</a>
            <a href="#" className="hover:text-white transition-colors">تواصل معنا</a>
          </div>
          
          <div className="text-sm">
            &copy; {new Date().getFullYear()} Clinic OS. جميع الحقوق محفوظة.
          </div>
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
        <DashboardMockup />
        <Features />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}