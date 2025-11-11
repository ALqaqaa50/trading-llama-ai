import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, TrendingDown, DollarSign, Activity, Target, Award } from "lucide-react";

export default function Performance() {
  const [timeRange, setTimeRange] = useState<"week" | "month" | "all">("month");

  // Fetch performance stats
  const { data: stats, isLoading } = trpc.trading.getPerformanceStats.useQuery(
    { timeRange },
    { refetchInterval: 30000 }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-purple-500" />
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("ar-SA", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const totalPnL = stats?.totalPnL || 0;
  const winRate = stats?.winRate || 0;
  const totalTrades = stats?.totalTrades || 0;
  const winningTrades = stats?.winningTrades || 0;
  const losingTrades = stats?.losingTrades || 0;
  const avgWin = stats?.avgWin || 0;
  const avgLoss = stats?.avgLoss || 0;
  const bestTrade = stats?.bestTrade || 0;
  const worstTrade = stats?.worstTrade || 0;
  const profitFactor = stats?.profitFactor || 0;

  const isProfitable = totalPnL >= 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">📊 إحصائيات الأداء</h1>
            <p className="text-slate-400 mt-1">تحليل شامل لأداء التداول الخاص بك</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={timeRange === "week" ? "default" : "outline"}
              className={timeRange === "week" ? "bg-purple-600" : "border-slate-600 text-slate-300"}
              onClick={() => setTimeRange("week")}
            >
              أسبوع
            </Button>
            <Button
              variant={timeRange === "month" ? "default" : "outline"}
              className={timeRange === "month" ? "bg-purple-600" : "border-slate-600 text-slate-300"}
              onClick={() => setTimeRange("month")}
            >
              شهر
            </Button>
            <Button
              variant={timeRange === "all" ? "default" : "outline"}
              className={timeRange === "all" ? "bg-purple-600" : "border-slate-600 text-slate-300"}
              onClick={() => setTimeRange("all")}
            >
              الكل
            </Button>
          </div>
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                إجمالي الربح/الخسارة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <p className={`text-3xl font-bold ${isProfitable ? "text-green-400" : "text-red-400"}`}>
                  {formatCurrency(totalPnL)}
                </p>
                {isProfitable ? (
                  <TrendingUp className="w-5 h-5 text-green-400" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-400" />
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
                <Target className="w-4 h-4" />
                معدل النجاح
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-slate-100">{winRate.toFixed(1)}%</p>
                <Badge variant={winRate >= 50 ? "default" : "destructive"} className="text-xs">
                  {winRate >= 50 ? "ممتاز" : "يحتاج تحسين"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                عدد الصفقات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-100">{totalTrades}</p>
              <p className="text-sm text-slate-400 mt-1">
                <span className="text-green-400">{winningTrades} رابحة</span> •{" "}
                <span className="text-red-400">{losingTrades} خاسرة</span>
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
                <Award className="w-4 h-4" />
                Profit Factor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-slate-100">{profitFactor.toFixed(2)}</p>
                <Badge variant={profitFactor >= 1.5 ? "default" : "secondary"} className="text-xs">
                  {profitFactor >= 2 ? "ممتاز" : profitFactor >= 1.5 ? "جيد" : "ضعيف"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-slate-100">📈 متوسط الأرباح والخسائر</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                <span className="text-slate-300">متوسط الربح</span>
                <span className="text-xl font-bold text-green-400">{formatCurrency(avgWin)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-red-500/10 rounded-lg border border-red-500/30">
                <span className="text-slate-300">متوسط الخسارة</span>
                <span className="text-xl font-bold text-red-400">{formatCurrency(Math.abs(avgLoss))}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                <span className="text-slate-300">نسبة الربح/الخسارة</span>
                <span className="text-xl font-bold text-blue-400">
                  {avgLoss !== 0 ? (avgWin / Math.abs(avgLoss)).toFixed(2) : "N/A"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-slate-100">🏆 أفضل وأسوأ صفقة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-green-400" />
                  <span className="text-slate-300">أفضل صفقة</span>
                </div>
                <span className="text-xl font-bold text-green-400">{formatCurrency(bestTrade)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-red-500/10 rounded-lg border border-red-500/30">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-red-400" />
                  <span className="text-slate-300">أسوأ صفقة</span>
                </div>
                <span className="text-xl font-bold text-red-400">{formatCurrency(worstTrade)}</span>
              </div>
              <div className="p-3 bg-slate-700/30 rounded-lg">
                <p className="text-sm text-slate-400 text-center">
                  الفرق: <span className="text-slate-200 font-semibold">{formatCurrency(bestTrade - worstTrade)}</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tips */}
        <Card className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-purple-500/30 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-slate-100">💡 نصائح لتحسين الأداء</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-slate-300">
            {winRate < 50 && (
              <p>• معدل النجاح أقل من 50% - حاول تحسين استراتيجية الدخول والخروج</p>
            )}
            {profitFactor < 1.5 && (
              <p>• Profit Factor منخفض - قلل حجم الخسائر وزد حجم الأرباح</p>
            )}
            {Math.abs(avgLoss) > avgWin && (
              <p>• متوسط الخسارة أكبر من متوسط الربح - استخدم Stop Loss أفضل</p>
            )}
            {totalTrades < 10 && (
              <p>• عدد الصفقات قليل - البيانات قد لا تكون كافية للتحليل الدقيق</p>
            )}
            {winRate >= 50 && profitFactor >= 1.5 && (
              <p className="text-green-400">✅ أداء ممتاز! استمر على هذا النهج</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
