import { useEffect, useRef, useState } from "react";
import {
  createChart,
  IChartApi,
  CandlestickData,
  Time,
} from "lightweight-charts";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Loader2 } from "lucide-react";

interface TradingChartProps {
  data: Array<{
    time: number | string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
  }>;
  indicators?: {
    rsi?: Array<{ time: number | string; value: number }>;
    macd?: Array<{ time: number | string; value: number }>;
    bb?: {
      upper: Array<{ time: number | string; value: number }>;
      middle: Array<{ time: number | string; value: number }>;
      lower: Array<{ time: number | string; value: number }>;
    };
    sma?: Array<{ time: number | string; value: number }>;
    ema?: Array<{ time: number | string; value: number }>;
  };
  trades?: Array<{
    time: number | string;
    price: number;
    type: "buy" | "sell";
    label?: string;
  }>;
  height?: number;
}

export default function TradingChart({
  data,
  indicators,
  trades,
  height = 500,
}: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [showBB, setShowBB] = useState(true);
  const [showSMA, setShowSMA] = useState(true);
  const [showEMA, setShowEMA] = useState(true);

  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: height,
      layout: {
        background: { color: "#1a1d2e" },
        textColor: "#d1d4dc",
      },
      grid: {
        vertLines: { color: "#2b2f42" },
        horzLines: { color: "#2b2f42" },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: "#2b2f42",
      },
      timeScale: {
        borderColor: "#2b2f42",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    // Add candlestick series
    const candlestickSeries = chart.addSeries({
      type: 'Candlestick',
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
    } as any);

    // Convert and set candlestick data
    const candlestickData: CandlestickData[] = data.map((d) => ({
      time: (typeof d.time === "number" ? Math.floor(d.time / 1000) : d.time) as Time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

    candlestickSeries.setData(candlestickData);

    // Add Bollinger Bands
    if (indicators?.bb && showBB) {
      const upperSeries = chart.addSeries({
        type: 'Line',
        color: "#2962FF",
        lineWidth: 1,
      } as any);
      const middleSeries = chart.addSeries({
        type: 'Line',
        color: "#FF6D00",
        lineWidth: 1,
      } as any);
      const lowerSeries = chart.addSeries({
        type: 'Line',
        color: "#2962FF",
        lineWidth: 1,
      } as any);

      upperSeries.setData(
        indicators.bb.upper.map((d) => ({
          time: (typeof d.time === "number" ? Math.floor(d.time / 1000) : d.time) as Time,
          value: d.value,
        }))
      );
      middleSeries.setData(
        indicators.bb.middle.map((d) => ({
          time: (typeof d.time === "number" ? Math.floor(d.time / 1000) : d.time) as Time,
          value: d.value,
        }))
      );
      lowerSeries.setData(
        indicators.bb.lower.map((d) => ({
          time: (typeof d.time === "number" ? Math.floor(d.time / 1000) : d.time) as Time,
          value: d.value,
        }))
      );
    }

    // Add SMA
    if (indicators?.sma && showSMA) {
      const smaSeries = chart.addSeries({
        type: 'Line',
        color: "#FFA726",
        lineWidth: 2,
      } as any);
      smaSeries.setData(
        indicators.sma.map((d) => ({
          time: (typeof d.time === "number" ? Math.floor(d.time / 1000) : d.time) as Time,
          value: d.value,
        }))
      );
    }

    // Add EMA
    if (indicators?.ema && showEMA) {
      const emaSeries = chart.addSeries({
        type: 'Line',
        color: "#AB47BC",
        lineWidth: 2,
      } as any);
      emaSeries.setData(
        indicators.ema.map((d) => ({
          time: (typeof d.time === "number" ? Math.floor(d.time / 1000) : d.time) as Time,
          value: d.value,
        }))
      );
    }

    // Add trade markers
    if (trades && trades.length > 0) {
      const markers = trades.map((trade) => ({
        time: (typeof trade.time === "number" ? Math.floor(trade.time / 1000) : trade.time) as Time,
        position: (trade.type === "buy" ? "belowBar" : "aboveBar") as "belowBar" | "aboveBar",
        color: trade.type === "buy" ? "#26a69a" : "#ef5350",
        shape: (trade.type === "buy" ? "arrowUp" : "arrowDown") as "arrowUp" | "arrowDown",
        text: trade.label || (trade.type === "buy" ? "Buy" : "Sell"),
      }));
      (candlestickSeries as any).setMarkers(markers);
    }

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [data, indicators, trades, showBB, showSMA, showEMA, height]);

  if (data.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">جاري تحميل بيانات الرسم البياني...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={showBB ? "default" : "outline"}
          size="sm"
          onClick={() => setShowBB(!showBB)}
        >
          نطاقات بولينجر
        </Button>
        <Button
          variant={showSMA ? "default" : "outline"}
          size="sm"
          onClick={() => setShowSMA(!showSMA)}
        >
          المتوسط المتحرك البسيط
        </Button>
        <Button
          variant={showEMA ? "default" : "outline"}
          size="sm"
          onClick={() => setShowEMA(!showEMA)}
        >
          المتوسط المتحرك الأسي
        </Button>
      </div>
      <Card className="p-4">
        <div ref={chartContainerRef} style={{ position: "relative" }} />
      </Card>
    </div>
  );
}
