import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import { Loader2, CheckCircle2, XCircle, Key } from "lucide-react";
import { useLocation } from "wouter";

export default function ApiKeySetup() {
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [, setLocation] = useLocation();

  const saveKeyMutation = trpc.apiKeys.save.useMutation({
    onSuccess: () => {
      setShowSuccess(true);
      setTimeout(() => {
        setLocation("/");
      }, 2000);
    },
  });

  const testConnectionMutation = trpc.apiKeys.testConnection.useMutation();

  const handleSave = async () => {
    if (!apiKey || !secretKey || !passphrase) {
      return;
    }

    saveKeyMutation.mutate({
      exchange: "okx",
      apiKey,
      secretKey,
      passphrase,
    });
  };

  const handleTestConnection = async () => {
    if (!apiKey || !secretKey || !passphrase) {
      return;
    }

    // First save the key
    await saveKeyMutation.mutateAsync({
      exchange: "okx",
      apiKey,
      secretKey,
      passphrase,
    });

    // Then test connection
    testConnectionMutation.mutate({
      exchange: "okx",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-slate-700 bg-slate-800/50 backdrop-blur">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <Key className="w-6 h-6 text-blue-400" />
            <CardTitle className="text-2xl text-slate-100">إعداد مفاتيح OKX</CardTitle>
          </div>
          <CardDescription className="text-slate-400">
            أدخل مفاتيح API الخاصة بك من منصة OKX. سيتم تخزينها بشكل آمن ومشفر.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {showSuccess && (
            <Alert className="bg-green-500/10 border-green-500/50 text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                تم حفظ المفاتيح بنجاح! جاري التوجيه...
              </AlertDescription>
            </Alert>
          )}

          {saveKeyMutation.error && (
            <Alert className="bg-red-500/10 border-red-500/50 text-red-400">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                فشل حفظ المفاتيح: {saveKeyMutation.error.message}
              </AlertDescription>
            </Alert>
          )}

          {testConnectionMutation.data && !testConnectionMutation.data.success && (
            <Alert className="bg-red-500/10 border-red-500/50 text-red-400">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                فشل الاتصال بـ OKX. تحقق من صحة المفاتيح.
              </AlertDescription>
            </Alert>
          )}

          {testConnectionMutation.data?.success && (
            <Alert className="bg-green-500/10 border-green-500/50 text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                تم الاتصال بـ OKX بنجاح!
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="apiKey" className="text-slate-300">مفتاح API</Label>
            <Input
              id="apiKey"
              type="text"
              placeholder="أدخل مفتاح API"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="bg-slate-900/50 border-slate-700 text-slate-100 placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="secretKey" className="text-slate-300">المفتاح السري</Label>
            <Input
              id="secretKey"
              type="password"
              placeholder="أدخل المفتاح السري"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              className="bg-slate-900/50 border-slate-700 text-slate-100 placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="passphrase" className="text-slate-300">كلمة المرور (Passphrase)</Label>
            <Input
              id="passphrase"
              type="password"
              placeholder="أدخل كلمة المرور"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              className="bg-slate-900/50 border-slate-700 text-slate-100 placeholder:text-slate-500"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleTestConnection}
              disabled={!apiKey || !secretKey || !passphrase || saveKeyMutation.isPending || testConnectionMutation.isPending}
              variant="outline"
              className="flex-1 bg-slate-900/50 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
            >
              {testConnectionMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  جاري الاختبار...
                </>
              ) : (
                "اختبار الاتصال"
              )}
            </Button>
            <Button
              onClick={handleSave}
              disabled={!apiKey || !secretKey || !passphrase || saveKeyMutation.isPending}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saveKeyMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                "حفظ المفاتيح"
              )}
            </Button>
          </div>

          <div className="pt-4 border-t border-slate-700">
            <p className="text-xs text-slate-500 text-center">
              💡 تلميح: يمكنك الحصول على مفاتيح API من لوحة تحكم OKX في قسم "API Management"
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
