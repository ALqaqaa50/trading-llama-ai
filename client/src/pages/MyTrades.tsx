import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, TrendingUp, TrendingDown, DollarSign, Activity, X } from "lucide-react";

export default function MyTrades() {
  const [isOpenTradeDialogOpen, setIsOpenTradeDialogOpen] = useState(false);
  const [tradeForm, setTradeForm] = useState({
    symbol: "BTC/USDT",
    side: "buy" as "buy" | "sell",
    type: "market" as "market" | "limit",
    amount: "",
    price: "",
    stopLoss: "",
    takeProfit: "",
    leverage: "10",
    marginMode: "isolated" as "isolated" | "cross",
  });

  // Fetch data
  const { data: openPositions, isLoading: loadingPositions, refetch: refetchPositions } = trpc.trading.getOpenPositions.useQuery({});
  const { data: tradeHistory, isLoading: loadingHistory, refetch: refetchHistory } = trpc.trading.getTradeHistory.useQuery({ limit: 50 });
  const { data: pnlStats, isLoading: loadingStats, refetch: refetchStats } = trpc.trading.getPnLStats.useQuery();
  const { data: balance } = trpc.trading.getBalance.useQuery();

  // Mutations
  const placeOrderMutation = trpc.trading.placeOrder.useMutation({
    onSuccess: () => {
      toast.success("تم فتح الصفقة بنجاح!");
      setIsOpenTradeDialogOpen(false);
      refetchPositions();
      refetchHistory();
      refetchStats();
      // Reset form
      setTradeForm(prev => ({ ...prev, amount: "", price: "", stopLoss: "", takeProfit: "" }));
    },
    onError: (error) => {
      toast.error(`فشل فتح الصفقة: ${error.message}`);
    },
  });

  const closePositionMutation = trpc.trading.closePosition.useMutation({
    onSuccess: () => {
      toast.success("تم إغلاق المركز بنجاح!");
      refetchPositions();
      refetchHistory();
      refetchStats();
    },
    onError: (error) => {
      toast.error(`فشل إغلاق المركز: ${error.message}`);
    },
  });

  const handlePlaceOrder = () => {
    if (!tradeForm.amount || parseFloat(tradeForm.amount) <= 0) {
      toast.error("يرجى إدخال كمية صحيحة");
      return;
    }

    if (tradeForm.type === "limit" && (!tradeForm.price || parseFloat(tradeForm.price) <= 0)) {
      toast.error("يرجى إدخال سعر صحيح لأمر Limit");
      return;
    }

    placeOrderMutation.mutate({
      symbol: tradeForm.symbol,
      side: tradeForm.side,
      type: tradeForm.type,
      amount: parseFloat(tradeForm.amount),
      price: tradeForm.price ? parseFloat(tradeForm.price) : undefined,
      stopLoss: tradeForm.stopLoss ? parseFloat(tradeForm.stopLoss) : undefined,
      takeProfit: tradeForm.takeProfit ? parseFloat(tradeForm.takeProfit) : undefined,
      leverage: parseInt(tradeForm.leverage),
      marginMode: tradeForm.marginMode,
    });
  };

  const handleClosePosition = (symbol: string) => {
    if (confirm(`هل أنت متأكد من إغلاق المركز ${symbol}؟`)) {
      closePositionMutation.mutate({ symbol });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">صفقاتي</h1>
            <p className="text-slate-400 mt-1">إدارة المراكز المفتوحة وسجل الصفقات</p>
          </div>
          
          <Dialog open={isOpenTradeDialogOpen} onOpenChange={setIsOpenTradeDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <TrendingUp className="mr-2 h-4 w-4" />
                فتح صفقة جديدة
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 text-white border-slate-800">
              <DialogHeader>
                <DialogTitle>فتح صفقة جديدة</DialogTitle>
                <DialogDescription className="text-slate-400">
                  قم بملء التفاصيل لفتح صفقة على OKX
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>الزوج</Label>
                    <Input
                      value={tradeForm.symbol}
                      onChange={(e) => setTradeForm(prev => ({ ...prev, symbol: e.target.value }))}
                      placeholder="BTC/USDT"
                      className="bg-slate-800 border-slate-700"
                    />
                  </div>
                  <div>
                    <Label>الاتجاه</Label>
                    <Select value={tradeForm.side} onValueChange={(value: "buy" | "sell") => setTradeForm(prev => ({ ...prev, side: value }))}>
                      <SelectTrigger className="bg-slate-800 border-slate-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="buy">شراء (Long)</SelectItem>
                        <SelectItem value="sell">بيع (Short)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>نوع الأمر</Label>
                    <Select value={tradeForm.type} onValueChange={(value: "market" | "limit") => setTradeForm(prev => ({ ...prev, type: value }))}>
                      <SelectTrigger className="bg-slate-800 border-slate-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="market">Market (فوري)</SelectItem>
                        <SelectItem value="limit">Limit (محدد)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>الكمية</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={tradeForm.amount}
                      onChange={(e) => setTradeForm(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="0.01"
                      className="bg-slate-800 border-slate-700"
                    />
                  </div>
                </div>

                {tradeForm.type === "limit" && (
                  <div>
                    <Label>السعر</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={tradeForm.price}
                      onChange={(e) => setTradeForm(prev => ({ ...prev, price: e.target.value }))}
                      placeholder="105000"
                      className="bg-slate-800 border-slate-700"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Stop Loss (اختياري)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={tradeForm.stopLoss}
                      onChange={(e) => setTradeForm(prev => ({ ...prev, stopLoss: e.target.value }))}
                      placeholder="104000"
                      className="bg-slate-800 border-slate-700"
                    />
                  </div>
                  <div>
                    <Label>Take Profit (اختياري)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={tradeForm.takeProfit}
                      onChange={(e) => setTradeForm(prev => ({ ...prev, takeProfit: e.target.value }))}
                      placeholder="106000"
                      className="bg-slate-800 border-slate-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>الرافعة المالية</Label>
                    <Select value={tradeForm.leverage} onValueChange={(value) => setTradeForm(prev => ({ ...prev, leverage: value }))}>
                      <SelectTrigger className="bg-slate-800 border-slate-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="1">1x</SelectItem>
                        <SelectItem value="5">5x</SelectItem>
                        <SelectItem value="10">10x</SelectItem>
                        <SelectItem value="20">20x</SelectItem>
                        <SelectItem value="50">50x</SelectItem>
                        <SelectItem value="100">100x</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>نوع الهامش</Label>
                    <Select value={tradeForm.marginMode} onValueChange={(value: "isolated" | "cross") => setTradeForm(prev => ({ ...prev, marginMode: value }))}>
                      <SelectTrigger className="bg-slate-800 border-slate-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="isolated">Isolated (معزول)</SelectItem>
                        <SelectItem value="cross">Cross (متقاطع)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={handlePlaceOrder}
                  disabled={placeOrderMutation.isPending}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  {placeOrderMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      جاري التنفيذ...
                    </>
                  ) : (
                    "تنفيذ الصفقة"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-400">إجمالي الأرباح/الخسائر</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              ) : (
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-emerald-500" />
                  <span className={`text-2xl font-bold ${(pnlStats?.totalPnl || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    ${(pnlStats?.totalPnl || 0).toFixed(2)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-400">عدد الصفقات</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              ) : (
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-500" />
                  <span className="text-2xl font-bold">{pnlStats?.totalTrades || 0}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-400">معدل النجاح</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              ) : (
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                  <span className="text-2xl font-bold text-emerald-500">{(pnlStats?.winRate || 0).toFixed(1)}%</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-400">الرصيد المتاح</CardTitle>
            </CardHeader>
            <CardContent>
              {balance ? (
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-blue-500" />
                  <span className="text-2xl font-bold">${(balance.free?.USDT || 0).toFixed(2)}</span>
                </div>
              ) : (
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Open Positions */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle>المراكز المفتوحة</CardTitle>
            <CardDescription className="text-slate-400">
              المراكز النشطة حالياً على OKX
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingPositions ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : openPositions && openPositions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800 text-right">
                      <th className="pb-3 text-sm font-medium text-slate-400">الزوج</th>
                      <th className="pb-3 text-sm font-medium text-slate-400">الاتجاه</th>
                      <th className="pb-3 text-sm font-medium text-slate-400">الكمية</th>
                      <th className="pb-3 text-sm font-medium text-slate-400">سعر الدخول</th>
                      <th className="pb-3 text-sm font-medium text-slate-400">السعر الحالي</th>
                      <th className="pb-3 text-sm font-medium text-slate-400">P&L</th>
                      <th className="pb-3 text-sm font-medium text-slate-400">الرافعة</th>
                      <th className="pb-3 text-sm font-medium text-slate-400">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openPositions.map((position, index) => (
                      <tr key={index} className="border-b border-slate-800/50">
                        <td className="py-4 font-medium">{position.symbol}</td>
                        <td className="py-4">
                          <span className={`px-2 py-1 rounded text-xs ${position.side === 'long' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>
                            {position.side === 'long' ? 'Long' : 'Short'}
                          </span>
                        </td>
                        <td className="py-4">{position.amount.toFixed(4)}</td>
                        <td className="py-4">${position.entryPrice.toFixed(2)}</td>
                        <td className="py-4">${position.currentPrice.toFixed(2)}</td>
                        <td className="py-4">
                          <div className={`font-bold ${position.unrealizedPnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            ${position.unrealizedPnl.toFixed(2)}
                            <span className="text-xs ml-1">({position.unrealizedPnlPercent.toFixed(2)}%)</span>
                          </div>
                        </td>
                        <td className="py-4">{position.leverage}x</td>
                        <td className="py-4">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleClosePosition(position.symbol)}
                            disabled={closePositionMutation.isPending}
                          >
                            {closePositionMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <X className="h-4 w-4 mr-1" />
                                إغلاق
                              </>
                            )}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>لا توجد مراكز مفتوحة حالياً</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trade History */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle>سجل الصفقات</CardTitle>
            <CardDescription className="text-slate-400">
              آخر 50 صفقة منفذة
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingHistory ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : tradeHistory && tradeHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800 text-right">
                      <th className="pb-3 text-sm font-medium text-slate-400">التاريخ</th>
                      <th className="pb-3 text-sm font-medium text-slate-400">الزوج</th>
                      <th className="pb-3 text-sm font-medium text-slate-400">الاتجاه</th>
                      <th className="pb-3 text-sm font-medium text-slate-400">النوع</th>
                      <th className="pb-3 text-sm font-medium text-slate-400">الكمية</th>
                      <th className="pb-3 text-sm font-medium text-slate-400">السعر</th>
                      <th className="pb-3 text-sm font-medium text-slate-400">الحالة</th>
                      <th className="pb-3 text-sm font-medium text-slate-400">P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tradeHistory.map((trade) => (
                      <tr key={trade.id} className="border-b border-slate-800/50">
                        <td className="py-4 text-sm text-slate-400">
                          {new Date(trade.createdAt).toLocaleString('ar-EG')}
                        </td>
                        <td className="py-4 font-medium">{trade.symbol}</td>
                        <td className="py-4">
                          <span className={`px-2 py-1 rounded text-xs ${trade.side === 'buy' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>
                            {trade.side === 'buy' ? 'Buy' : 'Sell'}
                          </span>
                        </td>
                        <td className="py-4 text-sm">{trade.type}</td>
                        <td className="py-4">{trade.amount}</td>
                        <td className="py-4">${trade.averagePrice || trade.price || '-'}</td>
                        <td className="py-4">
                          <span className={`px-2 py-1 rounded text-xs ${
                            trade.status === 'filled' ? 'bg-emerald-500/20 text-emerald-500' :
                            trade.status === 'failed' ? 'bg-red-500/20 text-red-500' :
                            'bg-yellow-500/20 text-yellow-500'
                          }`}>
                            {trade.status}
                          </span>
                        </td>
                        <td className="py-4">
                          {trade.pnl ? (
                            <span className={`font-bold ${parseFloat(trade.pnl) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                              ${parseFloat(trade.pnl).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>لا يوجد سجل صفقات بعد</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
