import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, TrendingDown, DollarSign, Activity, Send } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function TradingDashboard() {
  const [selectedSymbol, setSelectedSymbol] = useState("BTC/USDT");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "مرحباً! أنا Trading Llama AI، مساعدك الذكي في التداول. كيف يمكنني مساعدتك اليوم؟",
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");

  // Fetch ticker data
  const { data: ticker, isLoading: tickerLoading } = trpc.market.getTicker.useQuery(
    { symbol: selectedSymbol },
    { refetchInterval: 5000 } // Refresh every 5 seconds
  );

  // Fetch balance
  const { data: balance, isLoading: balanceLoading } = trpc.market.getBalance.useQuery(
    undefined,
    { refetchInterval: 10000 } // Refresh every 10 seconds
  );

  // Fetch OHLCV data
  const { data: ohlcv, isLoading: ohlcvLoading } = trpc.market.fetchOHLCV.useQuery(
    { symbol: selectedSymbol, timeframe: "1h", limit: 100 },
    { refetchInterval: 60000 } // Refresh every minute
  );

  // AI Chat mutation
  const chatMutation = trpc.ai.chat.useMutation({
    onSuccess: (data) => {
      const aiMessage: Message = {
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    },
    onError: (error) => {
      const errorMessage: Message = {
        role: "assistant",
        content: `عذراً، حدث خطأ: ${error.message}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    },
  });

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      role: "user",
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    // Call real AI backend
    chatMutation.mutate({
      message: inputMessage,
      symbol: selectedSymbol,
    });

    setInputMessage("");
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const priceChange = ticker ? ((ticker.last - ticker.low) / ticker.low) * 100 : 0;
  const isPositive = priceChange >= 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-100">Trading Llama AI</h1>
          <div className="flex gap-3 items-center">
            <Button
              variant="outline"
              className="border-purple-500 text-purple-500 hover:bg-purple-500/10"
              onClick={() => window.location.href = '/bot'}
            >
              🤖 البوت
            </Button>
            <Button
              variant="outline"
              className="border-blue-500 text-blue-500 hover:bg-blue-500/10"
              onClick={() => window.location.href = '/trades'}
            >
              📊 صفقاتي
            </Button>
            <Button
              variant="outline"
              className="border-green-500 text-green-500 hover:bg-green-500/10"
              onClick={() => window.location.href = '/api-keys'}
            >
              🔑 مفاتيح API
            </Button>
            <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/50">
              متصل بـ OKX
            </Badge>
          </div>
        </div>

        {/* Market Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                السعر الحالي
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tickerLoading ? (
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              ) : (
                <div>
                  <p className="text-2xl font-bold text-slate-100">
                    {ticker ? formatPrice(ticker.last) : "--"}
                  </p>
                  <p className={`text-sm flex items-center gap-1 ${isPositive ? "text-green-400" : "text-red-400"}`}>
                    {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {priceChange.toFixed(2)}%
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-400">أعلى سعر (24س)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-slate-100">
                {ticker ? formatPrice(ticker.high) : "--"}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-400">أدنى سعر (24س)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-slate-100">
                {ticker ? formatPrice(ticker.low) : "--"}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                الحجم (24س)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-slate-100">
                {ticker ? ticker.volume.toFixed(2) : "--"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Chart Area (Placeholder) */}
          <Card className="lg:col-span-2 bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-slate-100">الرسم البياني - {selectedSymbol}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-96 flex items-center justify-center bg-slate-900/50 rounded-lg">
                {ohlcvLoading ? (
                  <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                ) : ohlcv && ohlcv.length > 0 ? (
                  <div className="text-center text-slate-400">
                    <p>تم جلب {ohlcv.length} شمعة</p>
                    <p className="text-sm mt-2">سيتم إضافة الرسم البياني التفاعلي قريباً</p>
                  </div>
                ) : (
                  <p className="text-slate-400">لا توجد بيانات متاحة</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Chat Interface */}
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-slate-100">محادثة مع AI</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Messages */}
              <div className="h-96 overflow-y-auto space-y-3 pr-2">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        msg.role === "user"
                          ? "bg-blue-600 text-white"
                          : "bg-slate-700 text-slate-100"
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {msg.timestamp.toLocaleTimeString("ar-SA")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Input */}
              <div className="flex gap-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="اكتب رسالتك هنا..."
                  className="bg-slate-900/50 border-slate-700 text-slate-100 placeholder:text-slate-500"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || chatMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {chatMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Balance Overview */}
        {balance && balance.length > 0 && (
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-slate-100">الرصيد</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {balance.slice(0, 8).map((bal) => (
                  <div key={bal.currency} className="bg-slate-900/50 rounded-lg p-3">
                    <p className="text-sm text-slate-400">{bal.currency}</p>
                    <p className="text-lg font-bold text-slate-100">{bal.total.toFixed(4)}</p>
                    <p className="text-xs text-slate-500">متاح: {bal.free.toFixed(4)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
