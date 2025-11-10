import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Play, Square, Activity, TrendingUp, AlertTriangle, Settings } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";

export default function BotControl() {
  const [botConfig, setBotConfig] = useState({
    symbol: "BTC/USDT",
    timeframe: "1m",
    rsiOverbought: 70,
    rsiOversold: 30,
    useMACD: true,
    useCandlestickPatterns: true,
    useAIConfirmation: true,
    maxTradesPerDay: 10,
    maxDailyLoss: 100,
    positionSizePercent: 2,
    stopLossPercent: 2,
    takeProfitPercent: 4,
    leverage: 1,
    tradeType: "spot" as "spot" | "futures",
    marginMode: "isolated" as "isolated" | "cross",
  });

  // Fetch bot status
  const { data: botStatus, refetch: refetchStatus } = trpc.bot.getStatus.useQuery(undefined, {
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Start bot mutation
  const startBotMutation = trpc.bot.start.useMutation({
    onSuccess: () => {
      toast.success("تم تشغيل البوت بنجاح!");
      refetchStatus();
    },
    onError: (error) => {
      toast.error(`فشل تشغيل البوت: ${error.message}`);
    },
  });

  // Stop bot mutation
  const stopBotMutation = trpc.bot.stop.useMutation({
    onSuccess: () => {
      toast.success("تم إيقاف البوت بنجاح!");
      refetchStatus();
    },
    onError: (error) => {
      toast.error(`فشل إيقاف البوت: ${error.message}`);
    },
  });

  const handleStartBot = () => {
    startBotMutation.mutate(botConfig);
  };

  const handleStopBot = () => {
    stopBotMutation.mutate();
  };

  const isRunning = botStatus?.isRunning || false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">🤖 التداول الآلي</h1>
            <p className="text-slate-400 mt-1">تحكم في البوت الذكي للتداول التلقائي</p>
          </div>
          <div className="flex gap-3 items-center">
            <Button
              variant="outline"
              className="border-blue-500 text-blue-500 hover:bg-blue-500/10"
              onClick={() => window.location.href = '/dashboard'}
            >
              ← العودة للوحة الرئيسية
            </Button>
            <Badge
              variant="outline"
              className={`${
                isRunning
                  ? "bg-green-500/10 text-green-400 border-green-500/50"
                  : "bg-slate-500/10 text-slate-400 border-slate-500/50"
              }`}
            >
              {isRunning ? "🟢 يعمل" : "⚫ متوقف"}
            </Badge>
          </div>
        </div>

        {/* Warning Alert */}
        <Alert className="bg-yellow-500/10 border-yellow-500/50">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <AlertTitle className="text-yellow-500">تحذير هام</AlertTitle>
          <AlertDescription className="text-yellow-200">
            التداول الآلي يحمل مخاطر عالية. تأكد من فهمك الكامل للاستراتيجية وحدود المخاطرة قبل التشغيل.
            ابدأ بمبالغ صغيرة واختبر النظام جيداً.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Bot Status */}
          <Card className="lg:col-span-1 bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                حالة البوت
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {botStatus ? (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">الحالة:</span>
                      <Badge variant={isRunning ? "default" : "secondary"}>
                        {isRunning ? "يعمل" : "متوقف"}
                      </Badge>
                    </div>

                    {botStatus.lastAnalysis && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-400">آخر تحليل:</span>
                        <span className="text-sm text-slate-100">
                          {new Date(botStatus.lastAnalysis).toLocaleTimeString("ar-SA")}
                        </span>
                      </div>
                    )}

                    {botStatus.currentSignal && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-400">الإشارة الحالية:</span>
                        <Badge
                          variant="outline"
                          className={
                            botStatus.currentSignal === "buy"
                              ? "bg-green-500/10 text-green-400 border-green-500/50"
                              : botStatus.currentSignal === "sell"
                              ? "bg-red-500/10 text-red-400 border-red-500/50"
                              : "bg-slate-500/10 text-slate-400 border-slate-500/50"
                          }
                        >
                          {botStatus.currentSignal === "buy"
                            ? "شراء"
                            : botStatus.currentSignal === "sell"
                            ? "بيع"
                            : "انتظار"}
                        </Badge>
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">الصفقات اليوم:</span>
                      <span className="text-sm text-slate-100">{botStatus.tradesExecutedToday}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">الربح/الخسارة اليوم:</span>
                      <span
                        className={`text-sm font-bold ${
                          botStatus.dailyPnL >= 0 ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        ${botStatus.dailyPnL.toFixed(2)}
                      </span>
                    </div>

                    {botStatus.lastDecisionReason && (
                      <div className="mt-4 p-3 bg-slate-900/50 rounded-lg">
                        <p className="text-xs text-slate-400 mb-1">آخر قرار:</p>
                        <p className="text-sm text-slate-100">{botStatus.lastDecisionReason}</p>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 space-y-2">
                    {isRunning ? (
                      <Button
                        onClick={handleStopBot}
                        disabled={stopBotMutation.isPending}
                        className="w-full bg-red-600 hover:bg-red-700"
                      >
                        {stopBotMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Square className="w-4 h-4 mr-2" />
                        )}
                        إيقاف البوت
                      </Button>
                    ) : (
                      <Button
                        onClick={handleStartBot}
                        disabled={startBotMutation.isPending}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        {startBotMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Play className="w-4 h-4 mr-2" />
                        )}
                        تشغيل البوت
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center text-slate-400 py-8">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                  <p>جاري التحميل...</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bot Configuration */}
          <Card className="lg:col-span-2 bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                إعدادات الاستراتيجية
              </CardTitle>
              <CardDescription className="text-slate-400">
                قم بتكوين معايير البوت قبل التشغيل
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Market Settings */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-300">إعدادات السوق</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="symbol" className="text-slate-300">
                      الزوج
                    </Label>
                    <Input
                      id="symbol"
                      value={botConfig.symbol}
                      onChange={(e) => setBotConfig({ ...botConfig, symbol: e.target.value })}
                      className="bg-slate-900/50 border-slate-700 text-slate-100"
                      disabled={isRunning}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timeframe" className="text-slate-300">
                      الإطار الزمني
                    </Label>
                    <Select
                      value={botConfig.timeframe}
                      onValueChange={(value) => setBotConfig({ ...botConfig, timeframe: value })}
                      disabled={isRunning}
                    >
                      <SelectTrigger className="bg-slate-900/50 border-slate-700 text-slate-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1m">1 دقيقة</SelectItem>
                        <SelectItem value="5m">5 دقائق</SelectItem>
                        <SelectItem value="15m">15 دقيقة</SelectItem>
                        <SelectItem value="1h">1 ساعة</SelectItem>
                        <SelectItem value="4h">4 ساعات</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Technical Indicators */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-300">المؤشرات الفنية</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rsiOverbought" className="text-slate-300">
                      RSI تشبع شرائي
                    </Label>
                    <Input
                      id="rsiOverbought"
                      type="number"
                      value={botConfig.rsiOverbought}
                      onChange={(e) =>
                        setBotConfig({ ...botConfig, rsiOverbought: Number(e.target.value) })
                      }
                      className="bg-slate-900/50 border-slate-700 text-slate-100"
                      disabled={isRunning}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rsiOversold" className="text-slate-300">
                      RSI تشبع بيعي
                    </Label>
                    <Input
                      id="rsiOversold"
                      type="number"
                      value={botConfig.rsiOversold}
                      onChange={(e) =>
                        setBotConfig({ ...botConfig, rsiOversold: Number(e.target.value) })
                      }
                      className="bg-slate-900/50 border-slate-700 text-slate-100"
                      disabled={isRunning}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="useMACD" className="text-slate-300">
                      استخدام MACD
                    </Label>
                    <Switch
                      id="useMACD"
                      checked={botConfig.useMACD}
                      onCheckedChange={(checked) => setBotConfig({ ...botConfig, useMACD: checked })}
                      disabled={isRunning}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="useCandlestickPatterns" className="text-slate-300">
                      استخدام أنماط الشموع
                    </Label>
                    <Switch
                      id="useCandlestickPatterns"
                      checked={botConfig.useCandlestickPatterns}
                      onCheckedChange={(checked) =>
                        setBotConfig({ ...botConfig, useCandlestickPatterns: checked })
                      }
                      disabled={isRunning}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="useAIConfirmation" className="text-slate-300">
                      تأكيد من AI
                    </Label>
                    <Switch
                      id="useAIConfirmation"
                      checked={botConfig.useAIConfirmation}
                      onCheckedChange={(checked) =>
                        setBotConfig({ ...botConfig, useAIConfirmation: checked })
                      }
                      disabled={isRunning}
                    />
                  </div>
                </div>
              </div>

              {/* Risk Management */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-300">إدارة المخاطر</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxTradesPerDay" className="text-slate-300">
                      حد الصفقات اليومية
                    </Label>
                    <Input
                      id="maxTradesPerDay"
                      type="number"
                      value={botConfig.maxTradesPerDay}
                      onChange={(e) =>
                        setBotConfig({ ...botConfig, maxTradesPerDay: Number(e.target.value) })
                      }
                      className="bg-slate-900/50 border-slate-700 text-slate-100"
                      disabled={isRunning}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxDailyLoss" className="text-slate-300">
                      حد الخسارة اليومية ($)
                    </Label>
                    <Input
                      id="maxDailyLoss"
                      type="number"
                      value={botConfig.maxDailyLoss}
                      onChange={(e) =>
                        setBotConfig({ ...botConfig, maxDailyLoss: Number(e.target.value) })
                      }
                      className="bg-slate-900/50 border-slate-700 text-slate-100"
                      disabled={isRunning}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="stopLossPercent" className="text-slate-300">
                      Stop Loss (%)
                    </Label>
                    <Input
                      id="stopLossPercent"
                      type="number"
                      value={botConfig.stopLossPercent}
                      onChange={(e) =>
                        setBotConfig({ ...botConfig, stopLossPercent: Number(e.target.value) })
                      }
                      className="bg-slate-900/50 border-slate-700 text-slate-100"
                      disabled={isRunning}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="takeProfitPercent" className="text-slate-300">
                      Take Profit (%)
                    </Label>
                    <Input
                      id="takeProfitPercent"
                      type="number"
                      value={botConfig.takeProfitPercent}
                      onChange={(e) =>
                        setBotConfig({ ...botConfig, takeProfitPercent: Number(e.target.value) })
                      }
                      className="bg-slate-900/50 border-slate-700 text-slate-100"
                      disabled={isRunning}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
