import { getMarketData } from "../db";
import { calculateRealIndicators } from "./realIndicators";

/**
 * Backtesting Engine for Trading Strategies
 * Tests strategies on historical data and calculates performance metrics
 */

export interface BacktestConfig {
  symbol: string;
  timeframe: string;
  startDate: Date;
  endDate: Date;
  initialCapital: number;
  strategy: TradingStrategy;
  riskPerTrade: number; // Percentage of capital to risk per trade (e.g., 0.02 for 2%)
  maxPositions: number; // Maximum concurrent positions
}

export interface TradingStrategy {
  name: string;
  // RSI Strategy
  rsiEnabled?: boolean;
  rsiOversold?: number;
  rsiOverbought?: number;
  // MACD Strategy
  macdEnabled?: boolean;
  // Bollinger Bands Strategy
  bbEnabled?: boolean;
  // Moving Average Strategy
  maEnabled?: boolean;
  maPeriodFast?: number;
  maPeriodSlow?: number;
}

export interface Trade {
  entryTime: Date;
  entryPrice: number;
  exitTime?: Date;
  exitPrice?: number;
  quantity: number;
  side: "buy" | "sell";
  pnl?: number;
  pnlPercent?: number;
  reason: string;
}

export interface BacktestResult {
  strategy: string;
  symbol: string;
  timeframe: string;
  startDate: Date;
  endDate: Date;
  initialCapital: number;
  finalCapital: number;
  totalReturn: number;
  totalReturnPercent: number;
  sharpeRatio: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  winRate: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  trades: Trade[];
  equityCurve: { time: Date; equity: number }[];
}

/**
 * Run backtest on historical data
 */
export async function runBacktest(config: BacktestConfig): Promise<BacktestResult> {
  // Fetch historical market data
  const marketData = await getMarketData(
    config.symbol,
    config.timeframe,
    config.startDate,
    config.endDate,
    10000 // Large limit to get all data
  );

  if (marketData.length < 50) {
    throw new Error("Insufficient historical data for backtesting (minimum 50 candles required)");
  }

  // Initialize backtest state
  let capital = config.initialCapital;
  let equity = capital;
  const trades: Trade[] = [];
  const equityCurve: { time: Date; equity: number }[] = [];
  let openPosition: Trade | null = null;
  let peakEquity = capital;
  let maxDrawdown = 0;

  // Prepare OHLCV data for indicator calculation
  const ohlcvArray = marketData.map(d => [
    d.timestamp.getTime(),
    parseFloat(d.open),
    parseFloat(d.high),
    parseFloat(d.low),
    parseFloat(d.close),
    parseFloat(d.volume),
  ]);

  // Note: For backtesting, we'll calculate indicators per candle
  // This is a simplified approach - in production, batch calculation would be better

  // Iterate through each candle
  for (let i = 50; i < marketData.length; i++) {
    const candle = marketData[i];
    const price = parseFloat(candle.close);
    const time = candle.timestamp;

    // Calculate indicators for current window
    const windowData = ohlcvArray.slice(Math.max(0, i - 100), i + 1);
    let indicators: any;
    try {
      indicators = await calculateRealIndicators(windowData);
    } catch (error) {
      console.error('Failed to calculate indicators:', error);
      continue;
    }

    const rsi = indicators.rsi;
    const macd = indicators.macd;
    const bb = indicators.bollinger_bands;
    const sma = indicators.moving_averages?.sma_20;
    const ema = indicators.moving_averages?.ema_20;

    // Check for exit signals if position is open
    if (openPosition) {
      let shouldExit = false;
      let exitReason = "";

      if (openPosition.side === "buy") {
        // Exit long position
        if (config.strategy.rsiEnabled && rsi && rsi > (config.strategy.rsiOverbought || 70)) {
          shouldExit = true;
          exitReason = "RSI Overbought";
        } else if (config.strategy.macdEnabled && macd && macd.histogram !== null && macd.histogram < 0) {
          shouldExit = true;
          exitReason = "MACD Bearish Crossover";
        } else if (config.strategy.bbEnabled && bb && price > bb.upper) {
          shouldExit = true;
          exitReason = "Price Above Upper BB";
        }
      }

      if (shouldExit) {
        // Close position
        openPosition.exitTime = time;
        openPosition.exitPrice = price;
        const pnl = (price - openPosition.entryPrice) * openPosition.quantity;
        const pnlPercent = ((price - openPosition.entryPrice) / openPosition.entryPrice) * 100;
        openPosition.pnl = pnl;
        openPosition.pnlPercent = pnlPercent;
        openPosition.reason += ` | Exit: ${exitReason}`;

        capital += pnl;
        equity = capital;
        trades.push(openPosition);
        openPosition = null;
      }
    }

    // Check for entry signals if no position is open
    if (!openPosition && trades.length < 1000) { // Limit total trades
      let shouldEnter = false;
      let entryReason = "";

      // Buy signals
      if (config.strategy.rsiEnabled && rsi && rsi < (config.strategy.rsiOversold || 30)) {
        shouldEnter = true;
        entryReason = "RSI Oversold";
      } else if (config.strategy.macdEnabled && macd && macd.histogram !== null && macd.histogram > 0) {
        shouldEnter = true;
        entryReason = "MACD Bullish Crossover";
      } else if (config.strategy.bbEnabled && bb && price < bb.lower) {
        shouldEnter = true;
        entryReason = "Price Below Lower BB";
      } else if (config.strategy.maEnabled && sma && ema && ema > sma) {
        shouldEnter = true;
        entryReason = "MA Golden Cross";
      }

      if (shouldEnter) {
        // Calculate position size based on risk
        const riskAmount = capital * config.riskPerTrade;
        const stopLossPercent = 0.02; // 2% stop loss
        const quantity = riskAmount / (price * stopLossPercent);

        // Open new position
        openPosition = {
          entryTime: time,
          entryPrice: price,
          quantity,
          side: "buy",
          reason: entryReason,
        };
      }
    }

    // Update equity curve
    let currentEquity = capital;
    if (openPosition) {
      const unrealizedPnl = (price - openPosition.entryPrice) * openPosition.quantity;
      currentEquity = capital + unrealizedPnl;
    }
    equity = currentEquity;
    equityCurve.push({ time, equity });

    // Track max drawdown
    if (equity > peakEquity) {
      peakEquity = equity;
    }
    const drawdown = peakEquity - equity;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  // Close any remaining open position at the end
  if (openPosition) {
    const lastPrice = parseFloat(marketData[marketData.length - 1].close);
    openPosition.exitTime = marketData[marketData.length - 1].timestamp;
    openPosition.exitPrice = lastPrice;
    const pnl = (lastPrice - openPosition.entryPrice) * openPosition.quantity;
    const pnlPercent = ((lastPrice - openPosition.entryPrice) / openPosition.entryPrice) * 100;
    openPosition.pnl = pnl;
    openPosition.pnlPercent = pnlPercent;
    openPosition.reason += " | Exit: End of Period";
    capital += pnl;
    equity = capital;
    trades.push(openPosition);
  }

  // Calculate performance metrics
  const finalCapital = equity;
  const totalReturn = finalCapital - config.initialCapital;
  const totalReturnPercent = (totalReturn / config.initialCapital) * 100;

  const winningTrades = trades.filter(t => t.pnl && t.pnl > 0);
  const losingTrades = trades.filter(t => t.pnl && t.pnl <= 0);
  const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;

  const avgWin = winningTrades.length > 0
    ? winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / winningTrades.length
    : 0;
  const avgLoss = losingTrades.length > 0
    ? Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / losingTrades.length)
    : 0;

  const profitFactor = avgLoss > 0 ? avgWin / avgLoss : 0;

  // Calculate Sharpe Ratio (simplified)
  const returns = equityCurve.map((point, i) => {
    if (i === 0) return 0;
    return (point.equity - equityCurve[i - 1].equity) / equityCurve[i - 1].equity;
  });
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const stdDev = Math.sqrt(
    returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
  );
  const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0; // Annualized

  const maxDrawdownPercent = peakEquity > 0 ? (maxDrawdown / peakEquity) * 100 : 0;

  return {
    strategy: config.strategy.name,
    symbol: config.symbol,
    timeframe: config.timeframe,
    startDate: config.startDate,
    endDate: config.endDate,
    initialCapital: config.initialCapital,
    finalCapital,
    totalReturn,
    totalReturnPercent,
    sharpeRatio,
    maxDrawdown,
    maxDrawdownPercent,
    winRate,
    totalTrades: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    avgWin,
    avgLoss,
    profitFactor,
    trades,
    equityCurve,
  };
}

/**
 * Compare multiple strategies
 */
export async function compareStrategies(
  configs: BacktestConfig[]
): Promise<BacktestResult[]> {
  const results: BacktestResult[] = [];

  for (const config of configs) {
    try {
      const result = await runBacktest(config);
      results.push(result);
    } catch (error) {
      console.error(`Failed to backtest strategy ${config.strategy.name}:`, error);
    }
  }

  return results;
}
