import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Key, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { APP_TITLE } from "@/const";

export default function ApiKeys() {
  const { user, loading: authLoading } = useAuth();
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    apiKey: "",
    secretKey: "",
    passphrase: "",
  });

  const utils = trpc.useUtils();
  const { data: apiKeys, isLoading } = trpc.apiKeys.list.useQuery(undefined, {
    enabled: !!user,
  });

  const saveMutation = trpc.apiKeys.save.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ مفاتيح API بنجاح");
      setFormData({ apiKey: "", secretKey: "", passphrase: "" });
      utils.apiKeys.list.invalidate();
    },
    onError: (error) => {
      toast.error("فشل حفظ المفاتيح: " + error.message);
    },
  });

  const testConnectionMutation = trpc.apiKeys.testConnection.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("✅ الاتصال ناجح! مفاتيح API تعمل بشكل صحيح");
      } else {
        toast.error("❌ فشل الاتصال. تحقق من صحة المفاتيح");
      }
    },
    onError: (error) => {
      toast.error("خطأ في الاتصال: " + error.message);
    },
  });

  const deleteMutation = trpc.apiKeys.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف المفتاح بنجاح");
      utils.apiKeys.list.invalidate();
      setDeleteId(null);
    },
    onError: (error) => {
      toast.error("فشل الحذف: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.apiKey || !formData.secretKey || !formData.passphrase) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    saveMutation.mutate({
      exchange: "okx",
      apiKey: formData.apiKey,
      secretKey: formData.secretKey,
      passphrase: formData.passphrase,
    });
  };

  const handleTestConnection = () => {
    testConnectionMutation.mutate({ exchange: "okx" });
  };

  const handleDelete = (id: number) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteMutation.mutate({ id: deleteId });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>تسجيل الدخول مطلوب</CardTitle>
            <CardDescription>يجب تسجيل الدخول للوصول إلى إدارة مفاتيح API</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-white flex items-center justify-center gap-2">
            <Key className="w-8 h-8 text-blue-400" />
            إدارة مفاتيح API
          </h1>
          <p className="text-slate-400">قم بإضافة وإدارة مفاتيح OKX API الخاصة بك بشكل آمن</p>
        </div>

        {/* Add New API Key Form */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Plus className="w-5 h-5" />
              إضافة مفتاح API جديد
            </CardTitle>
            <CardDescription className="text-slate-400">
              احصل على مفاتيح API من{" "}
              <a
                href="https://www.okx.com/account/my-api"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                لوحة تحكم OKX
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* API Key */}
              <div className="space-y-2">
                <Label htmlFor="apiKey" className="text-white">
                  API Key <span className="text-red-400">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="apiKey"
                    type={showApiKey ? "text" : "password"}
                    value={formData.apiKey}
                    onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                    placeholder="أدخل API Key"
                    className="bg-slate-700 border-slate-600 text-white pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Secret Key */}
              <div className="space-y-2">
                <Label htmlFor="secretKey" className="text-white">
                  Secret Key <span className="text-red-400">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="secretKey"
                    type={showSecretKey ? "text" : "password"}
                    value={formData.secretKey}
                    onChange={(e) => setFormData({ ...formData, secretKey: e.target.value })}
                    placeholder="أدخل Secret Key"
                    className="bg-slate-700 border-slate-600 text-white pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecretKey(!showSecretKey)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Passphrase */}
              <div className="space-y-2">
                <Label htmlFor="passphrase" className="text-white">
                  Passphrase <span className="text-red-400">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="passphrase"
                    type={showPassphrase ? "text" : "password"}
                    value={formData.passphrase}
                    onChange={(e) => setFormData({ ...formData, passphrase: e.target.value })}
                    placeholder="أدخل Passphrase"
                    className="bg-slate-700 border-slate-600 text-white pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassphrase(!showPassphrase)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Security Notice */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 flex gap-2">
                <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-300">
                  <p className="font-semibold mb-1">ملاحظة أمنية:</p>
                  <p>سيتم تشفير جميع المفاتيح قبل حفظها في قاعدة البيانات. لن يتمكن أحد من الوصول إليها.</p>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 ml-2" />
                    حفظ المفاتيح
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Saved API Keys */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <span>المفاتيح المحفوظة</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestConnection}
                disabled={testConnectionMutation.isPending || !apiKeys || apiKeys.length === 0}
                className="border-slate-600 text-white hover:bg-slate-700"
              >
                {testConnectionMutation.isPending ? (
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 ml-2" />
                )}
                اختبار الاتصال
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : !apiKeys || apiKeys.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Key className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>لا توجد مفاتيح محفوظة</p>
                <p className="text-sm mt-1">قم بإضافة مفتاح API أعلاه للبدء</p>
              </div>
            ) : (
              <div className="space-y-3">
                {apiKeys.map((key) => (
                  <div
                    key={key.id}
                    className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                        <Key className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium uppercase">{key.exchange}</p>
                        <p className="text-sm text-slate-400">
                          {key.isActive ? (
                            <span className="flex items-center gap-1 text-green-400">
                              <CheckCircle2 className="w-3 h-3" />
                              نشط
                            </span>
                          ) : (
                            <span className="text-slate-500">غير نشط</span>
                          )}
                        </p>
                        {key.lastUsed && (
                          <p className="text-xs text-slate-500">
                            آخر استخدام: {new Date(key.lastUsed).toLocaleDateString("ar-SA")}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(key.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* How to Get API Keys */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">كيفية الحصول على مفاتيح API من OKX</CardTitle>
          </CardHeader>
          <CardContent className="text-slate-300 space-y-3">
            <ol className="list-decimal list-inside space-y-2">
              <li>سجل الدخول إلى حسابك في OKX</li>
              <li>
                اذهب إلى{" "}
                <a
                  href="https://www.okx.com/account/my-api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  إعدادات API
                </a>
              </li>
              <li>انقر على "Create API"</li>
              <li>اختر الصلاحيات المطلوبة (Trading, Read)</li>
              <li>احفظ API Key, Secret Key, و Passphrase في مكان آمن</li>
              <li>الصق المفاتيح في النموذج أعلاه</li>
            </ol>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex gap-2 mt-4">
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-300">
                <p className="font-semibold">تحذير:</p>
                <p>لا تشارك مفاتيح API الخاصة بك مع أي شخص. احتفظ بها في مكان آمن.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              هل أنت متأكد من حذف هذا المفتاح؟ لن تتمكن من التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 text-white border-slate-600 hover:bg-slate-600">
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  جاري الحذف...
                </>
              ) : (
                "حذف"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
