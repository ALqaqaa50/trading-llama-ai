import { useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, Brain, Shield, Zap, BarChart3, Key } from "lucide-react";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  
  // Check if user has API keys configured
  const { data: apiKeys, isLoading: keysLoading } = trpc.apiKeys.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  useEffect(() => {
    // If authenticated and has API keys, redirect to dashboard
    if (isAuthenticated && apiKeys && apiKeys.length > 0) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, apiKeys, setLocation]);

  if (loading || keysLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  if (isAuthenticated && (!apiKeys || apiKeys.length === 0)) {
    // User is logged in but hasn't set up API keys
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-slate-700 bg-slate-800/50 backdrop-blur">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Key className="w-16 h-16 text-blue-400" />
            </div>
            <CardTitle className="text-2xl text-slate-100">مرحباً {user?.name}!</CardTitle>
            <CardDescription className="text-slate-400">
              لبدء استخدام Trading Llama AI، تحتاج إلى إعداد مفاتيح API الخاصة بمنصة OKX
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setLocation("/setup")}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              إعداد مفاتيح OKX
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Landing page for non-authenticated users
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center space-y-6 mb-16">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Brain className="w-16 h-16 text-blue-400" />
            <h1 className="text-5xl font-bold text-slate-100">Trading Llama AI</h1>
          </div>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            نظام تداول ذكي مدعوم بالذكاء الاصطناعي المتقدم. استفد من قوة نموذج Llama لتحليل الأسواق واتخاذ قرارات تداول مستنيرة.
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              onClick={() => window.location.href = getLoginUrl()}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white text-lg px-8"
            >
              ابدأ الآن
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader>
              <TrendingUp className="w-10 h-10 text-blue-400 mb-2" />
              <CardTitle className="text-slate-100">تحليل السوق الذكي</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400">
                تحليل متقدم للأسواق باستخدام الذكاء الاصطناعي والتعلم الآلي لاكتشاف الفرص التداولية
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader>
              <Brain className="w-10 h-10 text-purple-400 mb-2" />
              <CardTitle className="text-slate-100">نموذج Llama المتخصص</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400">
                نموذج لغوي كبير مدرب خصيصاً على بيانات التداول لتقديم رؤى وتوصيات دقيقة
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader>
              <Shield className="w-10 h-10 text-green-400 mb-2" />
              <CardTitle className="text-slate-100">إدارة مخاطر متقدمة</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400">
                نظام متعدد المستويات لحماية رأس المال وتحديد حجم الصفقات بناءً على مبادئ Van Tharp
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader>
              <Zap className="w-10 h-10 text-yellow-400 mb-2" />
              <CardTitle className="text-slate-100">بيانات فورية من OKX</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400">
                اتصال مباشر بمنصة OKX لجلب بيانات الأسعار والأرصدة بشكل مستمر وفوري
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader>
              <BarChart3 className="w-10 h-10 text-red-400 mb-2" />
              <CardTitle className="text-slate-100">اختبار خلفي صارم</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400">
                اختبر استراتيجياتك على بيانات تاريخية مع مقاييس أداء شاملة (Sharpe Ratio، Max Drawdown)
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader>
              <Key className="w-10 h-10 text-cyan-400 mb-2" />
              <CardTitle className="text-slate-100">أمان متقدم</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400">
                تشفير AES لمفاتيح API وتخزين آمن لجميع البيانات الحساسة
              </p>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16">
          <Card className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 border-blue-700 backdrop-blur max-w-3xl mx-auto">
            <CardHeader>
              <CardTitle className="text-3xl text-slate-100">جاهز للبدء؟</CardTitle>
              <CardDescription className="text-slate-300 text-lg">
                انضم الآن واستفد من قوة الذكاء الاصطناعي في تداولك
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => window.location.href = getLoginUrl()}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white text-lg px-12"
              >
                تسجيل الدخول والبدء
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
