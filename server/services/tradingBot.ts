import { fetchOHLCV, fetchTicker } from './okxService';
import { placeOrder, getOpenPositions } from './okxTradingService';
import { calculateRSI, calculateMACD, detectTrend } from '../analysis/indicators';
import { analyzePatterns } from '../analysis/candlestickPatterns';
import { generateTradingInsight } from './aiTradingAssistant';
import { getActiveApiKey } from '../db';
import { saveTradeExecution } from '../db_trading';

/**
 * Automated Trading Bot
 * Continuously analyzes market data and executes trades automatically
 */

export interface BotConfig {
  userId: number;
  symbol: string;
  timeframe: string;
  enabled: boolean;
  
  // Strategy parameters
  rsiOverbought: number; // Default: 70
  rsiOversold: number; // Default: 30
  useMACD: boolean;
  useCandlestickPatterns: boolean;
  useAIConfirmation: boolean;
  
  // Risk management
  maxTradesPerDay: number;
  maxDailyLoss: number; // in USDT
  positionSizePercent: number; // % of balance per trade
  stopLossPercent: number;
  takeProfitPercent: number;
  leverage: number;
  
  // Execution
  tradeType: 'spot' | 'futures';
  marginMode: 'isolated' | 'cross';
}

export interface BotStatus {
  isRunning: boolean;
  lastAnalysis?: Date;
  lastTrade?: Date;
  tradesExecutedToday: number;
  dailyPnL: number;
  currentSignal?: 'buy' | 'sell' | 'hold';
  lastDecisionReason?: string;
}

// Global bot instances storage
const activeBots: Map<number, NodeJS.Timeout> = new Map();
const botStatuses: Map<number, BotStatus> = new Map();

/**
 * Start the trading bot for a user
 */
export async function startBot(config: BotConfig): Promise<boolean> {
  try {
    // Stop existing bot if running
    if (activeBots.has(config.userId)) {
      stopBot(config.userId);
    }

    // Initialize bot status
    botStatuses.set(config.userId, {
      isRunning: true,
      tradesExecutedToday: 0,
      dailyPnL: 0,
    });

    // Start bot loop (runs every minute)
    const intervalId = setInterval(async () => {
      await runBotCycle(config);
    }, 60000); // 60 seconds

    activeBots.set(config.userId, intervalId);

    // Run first cycle immediately
    await runBotCycle(config);

    console.log(`[Trading Bot] Started for user ${config.userId} on ${config.symbol}`);
    return true;
  } catch (error) {
    console.error('[Trading Bot] Failed to start:', error);
    return false;
  }
}

/**
 * Stop the trading bot for a user
 */
export function stopBot(userId: number): boolean {
  const intervalId = activeBots.get(userId);
  
  if (intervalId) {
    clearInterval(intervalId);
    activeBots.delete(userId);
    
    const status = botStatuses.get(userId);
    if (status) {
      status.isRunning = false;
      botStatuses.set(userId, status);
    }
    
    console.log(`[Trading Bot] Stopped for user ${userId}`);
    return true;
  }
  
  return false;
}

/**
 * Get bot status for a user
 */
export function getBotStatus(userId: number): BotStatus | null {
  return botStatuses.get(userId) || null;
}

/**
 * Main bot cycle - runs every minute
 */
async function runBotCycle(config: BotConfig): Promise<void> {
  try {
    const status = botStatuses.get(config.userId);
    if (!status || !status.isRunning) return;

    console.log(`[Trading Bot] Running cycle for user ${config.userId}...`);

    // Check safety limits
    if (status.tradesExecutedToday >= config.maxTradesPerDay) {
      console.log(`[Trading Bot] Max trades per day reached (${config.maxTradesPerDay})`);
      status.currentSignal = 'hold';
      status.lastDecisionReason = `تم الوصول للحد الأقصى من الصفقات اليومية (${config.maxTradesPerDay})`;
      botStatuses.set(config.userId, status);
      return;
    }

    if (status.dailyPnL <= -config.maxDailyLoss) {
      console.log(`[Trading Bot] Max daily loss reached ($${config.maxDailyLoss})`);
      status.currentSignal = 'hold';
      status.lastDecisionReason = `تم الوصول للحد الأقصى من الخسارة اليومية ($${config.maxDailyLoss})`;
      botStatuses.set(config.userId, status);
      stopBot(config.userId); // Auto-stop bot
      return;
    }

    // Get API key
    const apiKey = await getActiveApiKey(config.userId, 'okx');
    if (!apiKey) {
      console.log('[Trading Bot] No active API key found');
      return;
    }

    // Fetch market data
    const ticker = await fetchTicker(apiKey, config.symbol);
    const ohlcvData = await fetchOHLCV(apiKey, config.symbol, config.timeframe, undefined, 100);

    if (!ohlcvData || ohlcvData.length < 50) {
      console.log('[Trading Bot] Insufficient data for analysis');
      return;
    }

    // Convert to candles format
    const candles = ohlcvData.map(d => ({
      timestamp: d.timestamp,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
      volume: d.volume,
    }));

    const closes = candles.map(c => c.close);

    // Technical Analysis
    const rsi = calculateRSI(closes, 14);
    const currentRSI = rsi[rsi.length - 1];
    
    const macdResult = calculateMACD(closes);
    const currentMACD = {
      macd: macdResult.macd[macdResult.macd.length - 1],
      signal: macdResult.signal[macdResult.signal.length - 1],
      histogram: macdResult.histogram[macdResult.histogram.length - 1],
    };
    
    const trend = detectTrend(closes, 20);
    
    const patterns = config.useCandlestickPatterns 
      ? analyzePatterns(candles.slice(-10), trend)
      : [];

    // Decision logic
    let signal: 'buy' | 'sell' | 'hold' = 'hold';
    let reason = '';
    let confidence = 0;

    // RSI-based signals
    if (currentRSI < config.rsiOversold && trend !== 'downtrend') {
      signal = 'buy';
      reason = `RSI منخفض (${currentRSI.toFixed(2)}) - منطقة تشبع بيعي`;
      confidence += 30;
    } else if (currentRSI > config.rsiOverbought && trend !== 'uptrend') {
      signal = 'sell';
      reason = `RSI مرتفع (${currentRSI.toFixed(2)}) - منطقة تشبع شرائي`;
      confidence += 30;
    }

    // MACD confirmation
    if (config.useMACD && currentMACD) {
      if (currentMACD.histogram > 0 && signal === 'buy') {
        reason += ' + MACD إيجابي';
        confidence += 20;
      } else if (currentMACD.histogram < 0 && signal === 'sell') {
        reason += ' + MACD سلبي';
        confidence += 20;
      }
    }

    // Candlestick pattern confirmation
    if (config.useCandlestickPatterns && patterns.length > 0) {
      const bullishPatterns = patterns.filter(p => p.type === 'bullish');
      const bearishPatterns = patterns.filter(p => p.type === 'bearish');
      
      if (bullishPatterns.length > 0 && signal === 'buy') {
        reason += ` + نمط ${bullishPatterns[0].pattern}`;
        confidence += 20;
      } else if (bearishPatterns.length > 0 && signal === 'sell') {
        reason += ` + نمط ${bearishPatterns[0].pattern}`;
        confidence += 20;
      }
    }

    // AI Confirmation (if enabled and signal is strong enough)
    if (config.useAIConfirmation && signal !== 'hold' && confidence >= 50) {
      try {
        const priceChange = ((ticker.last - ticker.low) / ticker.low) * 100;
        const marketContext = {
          symbol: config.symbol,
          currentPrice: ticker.last,
          priceChange24h: priceChange,
          volume24h: ticker.volume,
          recentCandles: candles.slice(-20),
          timestamp: new Date(),
        };
        const aiInsight = await generateTradingInsight(marketContext);
        
        // Check if AI agrees with the signal
        if (
          (signal === 'buy' && aiInsight.recommendation === 'buy') ||
          (signal === 'sell' && aiInsight.recommendation === 'sell')
        ) {
          reason += ' + تأكيد من AI';
          confidence += 30;
        } else {
          // AI disagrees - reduce confidence
          confidence -= 20;
          reason += ' (لكن AI غير متأكد)';
        }
      } catch (error) {
        console.error('[Trading Bot] AI confirmation failed:', error);
      }
    }

    // Update status
    status.lastAnalysis = new Date();
    status.currentSignal = signal;
    status.lastDecisionReason = reason || 'لا توجد إشارات قوية';
    botStatuses.set(config.userId, status);

    console.log(`[Trading Bot] Signal: ${signal}, Confidence: ${confidence}%, Reason: ${reason}`);

    // Execute trade if confidence is high enough
    if (signal !== 'hold' && confidence >= 60) {
      await executeTrade(config, signal, ticker.last, reason);
    }

  } catch (error) {
    console.error('[Trading Bot] Error in bot cycle:', error);
  }
}

/**
 * Execute a trade based on bot decision
 */
async function executeTrade(
  config: BotConfig,
  signal: 'buy' | 'sell',
  currentPrice: number,
  reason: string
): Promise<void> {
  try {
    // Check if we already have an open position
    const openPositions = await getOpenPositions(config.userId, config.symbol);
    
    if (openPositions.length > 0) {
      console.log('[Trading Bot] Already have an open position, skipping trade');
      return;
    }

    // Calculate position size (simplified - should use actual balance)
    const positionSize = 0.001; // TODO: Calculate based on balance and config.positionSizePercent

    // Calculate stop-loss and take-profit
    const stopLoss = signal === 'buy'
      ? currentPrice * (1 - config.stopLossPercent / 100)
      : currentPrice * (1 + config.stopLossPercent / 100);
    
    const takeProfit = signal === 'buy'
      ? currentPrice * (1 + config.takeProfitPercent / 100)
      : currentPrice * (1 - config.takeProfitPercent / 100);

    // Place order
    const result = await placeOrder(config.userId, {
      symbol: config.symbol,
      side: signal,
      type: 'market',
      amount: positionSize,
      stopLoss,
      takeProfit,
      leverage: config.leverage,
      marginMode: config.marginMode,
    });

    if (result.success) {
      // Update bot status
      const status = botStatuses.get(config.userId);
      if (status) {
        status.tradesExecutedToday += 1;
        status.lastTrade = new Date();
        botStatuses.set(config.userId, status);
      }

      // Save to database with AI recommendation
      await saveTradeExecution({
        userId: config.userId,
        orderId: result.orderId || null,
        symbol: config.symbol,
        side: signal,
        type: 'market',
        amount: positionSize.toString(),
        stopLoss: stopLoss.toString(),
        takeProfit: takeProfit.toString(),
        leverage: config.leverage,
        marginMode: config.marginMode,
        status: 'filled',
        strategyUsed: 'Automated Bot',
        aiRecommendation: reason,
      });

      console.log(`[Trading Bot] Trade executed: ${signal} ${positionSize} ${config.symbol} @ $${currentPrice}`);
    } else {
      console.error(`[Trading Bot] Trade failed: ${result.error}`);
    }

  } catch (error) {
    console.error('[Trading Bot] Error executing trade:', error);
  }
}

/**
 * Reset daily counters (should be called at midnight)
 */
export function resetDailyCounters(userId: number): void {
  const status = botStatuses.get(userId);
  if (status) {
    status.tradesExecutedToday = 0;
    status.dailyPnL = 0;
    botStatuses.set(userId, status);
    console.log(`[Trading Bot] Daily counters reset for user ${userId}`);
  }
}
