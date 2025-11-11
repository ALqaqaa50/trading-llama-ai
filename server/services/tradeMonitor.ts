import { getOpenTrades, updateTradeExecution } from '../db_trading';
import { getApiKeysByUserId } from '../db';
import { fetchTicker } from './okxService';

/**
 * Trade Monitor Service
 * Monitors open trades and automatically closes them when Stop Loss or Take Profit is reached
 */

let monitorInterval: NodeJS.Timeout | null = null;

/**
 * Start monitoring all open trades
 */
export function startTradeMonitor() {
  if (monitorInterval) {
    console.log('[Trade Monitor] Already running');
    return;
  }

  console.log('[Trade Monitor] Starting...');
  
  // Monitor every 30 seconds
  monitorInterval = setInterval(async () => {
    try {
      await monitorAllTrades();
    } catch (error) {
      console.error('[Trade Monitor] Error:', error);
    }
  }, 30000); // 30 seconds

  // Run immediately on start
  monitorAllTrades().catch(console.error);
}

/**
 * Stop monitoring trades
 */
export function stopTradeMonitor() {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
    console.log('[Trade Monitor] Stopped');
  }
}

/**
 * Monitor all open trades for all users
 */
async function monitorAllTrades() {
  // This is a simplified version - in production, you'd want to track users separately
  // For now, we'll just check all open trades in the database
  
  const { getDb } = await import('../db');
  const db = await getDb();
  
  if (!db) {
    return;
  }

  try {
    const { tradeExecutions } = await import('../../drizzle/schema');
    const { eq } = await import('drizzle-orm');
    
    // Get all open trades
    const openTrades = await db
      .select()
      .from(tradeExecutions)
      .where(eq(tradeExecutions.status, 'filled'));

    console.log(`[Trade Monitor] Checking ${openTrades.length} open trades...`);

    for (const trade of openTrades) {
      // Skip if already closed
      if (trade.closedAt) {
        continue;
      }

      // Skip if no stop loss or take profit
      if (!trade.stopLoss && !trade.takeProfit) {
        continue;
      }

      try {
        await checkAndCloseTrade(trade);
      } catch (error) {
        console.error(`[Trade Monitor] Error checking trade ${trade.id}:`, error);
      }
    }
  } catch (error) {
    console.error('[Trade Monitor] Error monitoring trades:', error);
  }
}

/**
 * Check if a trade should be closed and close it if necessary
 */
async function checkAndCloseTrade(trade: any) {
  // Get user's API key
  const apiKeys = await getApiKeysByUserId(trade.userId);
  const apiKey = apiKeys && apiKeys.length > 0 ? apiKeys[0] : null;

  if (!apiKey) {
    console.warn(`[Trade Monitor] No API key for user ${trade.userId}`);
    return;
  }

  // Get current price
  const ticker = await fetchTicker(apiKey, trade.symbol);
  const currentPrice = ticker.last;

  console.log(`[Trade Monitor] Trade ${trade.id} - Symbol: ${trade.symbol}, Current: $${currentPrice}, Entry: $${trade.price}`);

  let shouldClose = false;
  let closeReason = '';
  let pnl = 0;

  const entryPrice = parseFloat(trade.price || '0');
  const amount = parseFloat(trade.amount || '0');

  // Check Stop Loss
  if (trade.stopLoss) {
    const stopLoss = parseFloat(trade.stopLoss);
    
    if (trade.side === 'buy' && currentPrice <= stopLoss) {
      shouldClose = true;
      closeReason = 'Stop Loss Hit';
      pnl = (currentPrice - entryPrice) * amount;
    } else if (trade.side === 'sell' && currentPrice >= stopLoss) {
      shouldClose = true;
      closeReason = 'Stop Loss Hit';
      pnl = (entryPrice - currentPrice) * amount;
    }
  }

  // Check Take Profit
  if (trade.takeProfit && !shouldClose) {
    const takeProfit = parseFloat(trade.takeProfit);
    
    if (trade.side === 'buy' && currentPrice >= takeProfit) {
      shouldClose = true;
      closeReason = 'Take Profit Hit';
      pnl = (currentPrice - entryPrice) * amount;
    } else if (trade.side === 'sell' && currentPrice <= takeProfit) {
      shouldClose = true;
      closeReason = 'Take Profit Hit';
      pnl = (entryPrice - currentPrice) * amount;
    }
  }

  if (shouldClose) {
    console.log(`[Trade Monitor] Closing trade ${trade.id} - Reason: ${closeReason}, PnL: $${pnl.toFixed(2)}`);

    // Close the trade on OKX
    try {
      const { placeOrder } = await import('./okxTradingService');
      
      // Place opposite order to close position
      const closeResult = await placeOrder(trade.userId, {
        symbol: trade.symbol,
        side: trade.side === 'buy' ? 'sell' : 'buy',
        type: 'market',
        amount,
      });

      if (closeResult.success) {
        // Update trade in database
        const pnlPercent = ((pnl / (entryPrice * amount)) * 100).toFixed(2);
        
        await updateTradeExecution(trade.id, {
          status: 'filled',
          closedAt: new Date(),
          pnl: pnl.toFixed(2),
          pnlPercent: pnlPercent,
          averagePrice: currentPrice.toString(),
        });

        console.log(`[Trade Monitor] ✅ Trade ${trade.id} closed successfully - PnL: $${pnl.toFixed(2)} (${pnlPercent}%)`);
        
        // Send Telegram notification
        const { sendTelegramNotification } = await import('./telegramNotification');
        const notificationType = closeReason === 'Stop Loss Hit' ? 'stop_loss' : 
                                closeReason === 'Take Profit Hit' ? 'take_profit' : 'trade_close';
        
        await sendTelegramNotification({
          userId: trade.userId,
          type: notificationType,
          symbol: trade.symbol,
          side: trade.side,
          price: currentPrice,
          pnl,
          message: `${closeReason === 'Stop Loss Hit' ? '🛑' : '🎯'} **تم إغلاق الصفقة!**\n\n` +
            `السبب: ${closeReason === 'Stop Loss Hit' ? 'Stop Loss' : 'Take Profit'}\n` +
            `سعر الدخول: $${entryPrice.toFixed(2)}\n` +
            `سعر الخروج: $${currentPrice.toFixed(2)}\n` +
            `نسبة الربح/الخسارة: ${pnlPercent}%`,
        });
      } else {
        console.error(`[Trade Monitor] Failed to close trade ${trade.id}:`, closeResult.error);
      }
    } catch (error) {
      console.error(`[Trade Monitor] Error closing trade ${trade.id}:`, error);
    }
  }
}

// Auto-start monitor when module is loaded
startTradeMonitor();
