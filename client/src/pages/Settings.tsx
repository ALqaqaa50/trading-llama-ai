import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Save, Send, Settings as SettingsIcon, Bell } from "lucide-react";
import { useLocation } from "wouter";

export default function Settings() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Risk Management Settings
  const { data: riskSettings, isLoading: loadingRisk, refetch: refetchRisk } = trpc.settings.getSettings.useQuery(undefined, {
    enabled: !!user,
  });

  const updateRiskMutation = trpc.settings.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ إعدادات المخاطر بنجاح!");
      refetchRisk();
    },
    onError: (error: any) => {
      toast.error(`فشل حفظ الإعدادات: ${error.message}`);
    },
  });

  // Telegram Settings
  const { data: telegramSettings, isLoading: loadingTelegram, refetch: refetchTelegram } = trpc.telegram.getSettings.useQuery(undefined, {
    enabled: !!user,
  });

  const updateTelegramMutation = trpc.telegram.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ إعدادات تيليجرام بنجاح!");
      refetchTelegram();
    },
    onError: (error: any) => {
      toast.error(`فشل حفظ الإعدادات: ${error.message}`);
    },
  });

  const testTelegramMutation = trpc.telegram.testNotification.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("تم إرسال رسالة اختبار إلى تيليجرام!");
      } else {
        toast.error("فشل إرسال رسالة الاختبار. تحقق من إعداداتك.");
      }
    },
    onError: (error: any) => {
      toast.error(`خطأ: ${error.message}`);
    },
  });

  // Form states
  const [riskPercentage, setRiskPercentage] = useState(riskSettings?.riskPercentage || "2");
  const [maxDailyLoss, setMaxDailyLoss] = useState(riskSettings?.maxDailyLoss || "");
  const [maxOpenTrades, setMaxOpenTrades] = useState(riskSettings?.maxOpenTrades || 3);

  const [chatId, setChatId] = useState(telegramSettings?.chatId || "");
  const [telegramEnabled, setTelegramEnabled] = useState(telegramSettings?.enabled === 1);
  const [notifyOnTradeOpen, setNotifyOnTradeOpen] = useState(telegramSettings?.notifyOnTradeOpen === 1);
  const [notifyOnTradeClose, setNotifyOnTradeClose] = useState(telegramSettings?.notifyOnTradeClose === 1);
  const [notifyOnStopLoss, setNotifyOnStopLoss] = useState(telegramSettings?.notifyOnStopLoss === 1);
  const [notifyOnTakeProfit, setNotifyOnTakeProfit] = useState(telegramSettings?.notifyOnTakeProfit === 1);
  const [notifyOnDailyLossLimit, setNotifyOnDailyLossLimit] = useState(telegramSettings?.notifyOnDailyLossLimit === 1);

  // Update form when data loads
  useState(() => {
    if (riskSettings) {
      setRiskPercentage(riskSettings.riskPercentage || "2");
      setMaxDailyLoss(riskSettings.maxDailyLoss || "");
      setMaxOpenTrades(riskSettings.maxOpenTrades || 3);
    }
  });

  useState(() => {
    if (telegramSettings) {
      setChatId(telegramSettings.chatId || "");
      setTelegramEnabled(telegramSettings.enabled === 1);
      setNotifyOnTradeOpen(telegramSettings.notifyOnTradeOpen === 1);
      setNotifyOnTradeClose(telegramSettings.notifyOnTradeClose === 1);
      setNotifyOnStopLoss(telegramSettings.notifyOnStopLoss === 1);
      setNotifyOnTakeProfit(telegramSettings.notifyOnTakeProfit === 1);
      setNotifyOnDailyLossLimit(telegramSettings.notifyOnDailyLossLimit === 1);
    }
  });

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSaveRiskSettings = () => {
    updateRiskMutation.mutate({
      riskPercentage,
      maxDailyLoss: maxDailyLoss || undefined,
      maxOpenTrades,
    });
  };

  const handleSaveTelegramSettings = () => {
    updateTelegramMutation.mutate({
      chatId: chatId || undefined,
      enabled: telegramEnabled ? 1 : 0,
      notifyOnTradeOpen: notifyOnTradeOpen ? 1 : 0,
      notifyOnTradeClose: notifyOnTradeClose ? 1 : 0,
      notifyOnStopLoss: notifyOnStopLoss ? 1 : 0,
      notifyOnTakeProfit: notifyOnTakeProfit ? 1 : 0,
      notifyOnDailyLossLimit: notifyOnDailyLossLimit ? 1 : 0,
    });
  };

  const handleTestTelegram = () => {
    testTelegramMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
      <div className="container max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            className="text-white hover:bg-white/10"
          >
            ← العودة
          </Button>
          <div className="flex items-center gap-2">
            <SettingsIcon className="h-8 w-8 text-blue-400" />
            <h1 className="text-3xl font-bold text-white">الإعدادات</h1>
          </div>
        </div>

        <div className="space-y-6">
          {/* Risk Management Settings */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                إدارة المخاطر
              </CardTitle>
              <CardDescription className="text-slate-400">
                تحكم في نسبة المخاطرة وحدود الخسارة
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingRisk ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="riskPercentage" className="text-white">
                      نسبة المخاطرة لكل صفقة (% من رأس المال)
                    </Label>
                    <Input
                      id="riskPercentage"
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="10"
                      value={riskPercentage}
                      onChange={(e) => setRiskPercentage(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="2"
                    />
                    <p className="text-sm text-slate-400">
                      القيمة الحالية: {riskPercentage}% (موصى به: 1-2%)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxDailyLoss" className="text-white">
                      الحد الأقصى للخسارة اليومية (USD)
                    </Label>
                    <Input
                      id="maxDailyLoss"
                      type="number"
                      step="10"
                      min="0"
                      value={maxDailyLoss}
                      onChange={(e) => setMaxDailyLoss(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="100"
                    />
                    <p className="text-sm text-slate-400">
                      سيتم إيقاف التداول تلقائياً عند الوصول لهذا الحد
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxOpenTrades" className="text-white">
                      الحد الأقصى للصفقات المفتوحة
                    </Label>
                    <Input
                      id="maxOpenTrades"
                      type="number"
                      min="1"
                      max="10"
                      value={maxOpenTrades}
                      onChange={(e) => setMaxOpenTrades(parseInt(e.target.value))}
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="3"
                    />
                  </div>

                  <Button
                    onClick={handleSaveRiskSettings}
                    disabled={updateRiskMutation.isPending}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {updateRiskMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        جاري الحفظ...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        حفظ إعدادات المخاطر
                      </>
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Telegram Notifications */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Bell className="h-5 w-5" />
                إشعارات تيليجرام
              </CardTitle>
              <CardDescription className="text-slate-400">
                احصل على تنبيهات فورية عبر تيليجرام
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingTelegram ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
                </div>
              ) : (
                <>
                  <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 space-y-2">
                    <h4 className="font-semibold text-blue-300">كيفية الإعداد:</h4>
                    <ol className="text-sm text-slate-300 space-y-1 list-decimal list-inside">
                      <li>افتح تيليجرام وابحث عن: <code className="bg-slate-700 px-2 py-1 rounded">@BotFather</code></li>
                      <li>أرسل: <code className="bg-slate-700 px-2 py-1 rounded">/newbot</code> واتبع التعليمات</li>
                      <li>احفظ Bot Token وأضفه في متغيرات البيئة: <code className="bg-slate-700 px-2 py-1 rounded">TELEGRAM_BOT_TOKEN</code></li>
                      <li>ابحث عن: <code className="bg-slate-700 px-2 py-1 rounded">@userinfobot</code> للحصول على Chat ID</li>
                      <li>أدخل Chat ID أدناه وفعّل الإشعارات</li>
                    </ol>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="chatId" className="text-white">
                      Telegram Chat ID
                    </Label>
                    <Input
                      id="chatId"
                      type="text"
                      value={chatId}
                      onChange={(e) => setChatId(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white font-mono"
                      placeholder="123456789"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="telegramEnabled" className="text-white">
                      تفعيل الإشعارات
                    </Label>
                    <Switch
                      id="telegramEnabled"
                      checked={telegramEnabled}
                      onCheckedChange={setTelegramEnabled}
                    />
                  </div>

                  <div className="space-y-3 border-t border-slate-700 pt-4">
                    <h4 className="font-semibold text-white">أنواع الإشعارات:</h4>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="notifyTradeOpen" className="text-slate-300">
                        عند فتح صفقة جديدة
                      </Label>
                      <Switch
                        id="notifyTradeOpen"
                        checked={notifyOnTradeOpen}
                        onCheckedChange={setNotifyOnTradeOpen}
                        disabled={!telegramEnabled}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="notifyTradeClose" className="text-slate-300">
                        عند إغلاق صفقة
                      </Label>
                      <Switch
                        id="notifyTradeClose"
                        checked={notifyOnTradeClose}
                        onCheckedChange={setNotifyOnTradeClose}
                        disabled={!telegramEnabled}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="notifyStopLoss" className="text-slate-300">
                        عند الوصول لـ Stop Loss
                      </Label>
                      <Switch
                        id="notifyStopLoss"
                        checked={notifyOnStopLoss}
                        onCheckedChange={setNotifyOnStopLoss}
                        disabled={!telegramEnabled}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="notifyTakeProfit" className="text-slate-300">
                        عند الوصول لـ Take Profit
                      </Label>
                      <Switch
                        id="notifyTakeProfit"
                        checked={notifyOnTakeProfit}
                        onCheckedChange={setNotifyOnTakeProfit}
                        disabled={!telegramEnabled}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="notifyDailyLoss" className="text-slate-300">
                        عند تجاوز حد الخسارة اليومي
                      </Label>
                      <Switch
                        id="notifyDailyLoss"
                        checked={notifyOnDailyLossLimit}
                        onCheckedChange={setNotifyOnDailyLossLimit}
                        disabled={!telegramEnabled}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveTelegramSettings}
                      disabled={updateTelegramMutation.isPending}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      {updateTelegramMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          جاري الحفظ...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          حفظ الإعدادات
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={handleTestTelegram}
                      disabled={testTelegramMutation.isPending || !chatId}
                      variant="outline"
                      className="border-blue-600 text-blue-400 hover:bg-blue-600/10"
                    >
                      {testTelegramMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          جاري الإرسال...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          اختبار
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
