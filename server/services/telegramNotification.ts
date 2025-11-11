/**
 * Telegram Notification Service
 * Sends trading notifications to users via Telegram Bot
 */

import { getDb } from '../db';
import { telegramSettings } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

// Telegram Bot Token - should be stored in environment variable
// For now, users need to create their own bot via @BotFather
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

export interface TradeNotification {
  userId: number;
  type: 'trade_open' | 'trade_close' | 'stop_loss' | 'take_profit' | 'daily_loss_limit';
  symbol: string;
  side: 'buy' | 'sell';
  price?: number;
  quantity?: number;
  pnl?: number;
  message: string;
}

/**
 * Send notification to Telegram
 */
export async function sendTelegramNotification(notification: TradeNotification): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) {
      console.warn('[Telegram] Database not available');
      return false;
    }

    // Get user's Telegram settings
    const settings = await db
      .select()
      .from(telegramSettings)
      .where(eq(telegramSettings.userId, notification.userId))
      .limit(1);

    if (settings.length === 0 || !settings[0].chatId || !settings[0].enabled) {
      console.log('[Telegram] Notifications not configured for user:', notification.userId);
      return false;
    }

    const userSettings = settings[0];

    // Check if this notification type is enabled
    const shouldNotify = checkNotificationEnabled(userSettings, notification.type);
    if (!shouldNotify) {
      console.log('[Telegram] Notification type disabled:', notification.type);
      return false;
    }

    // Format message
    const formattedMessage = formatNotificationMessage(notification);

    // Send to Telegram
    if (!TELEGRAM_BOT_TOKEN) {
      console.warn('[Telegram] Bot token not configured');
      return false;
    }

    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: userSettings.chatId,
          text: formattedMessage,
          parse_mode: 'Markdown',
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('[Telegram] Failed to send notification:', error);
      return false;
    }

    console.log('[Telegram] Notification sent successfully to user:', notification.userId);
    return true;
  } catch (error) {
    console.error('[Telegram] Error sending notification:', error);
    return false;
  }
}

/**
 * Check if notification type is enabled for user
 */
function checkNotificationEnabled(
  settings: any,
  type: TradeNotification['type']
): boolean {
  switch (type) {
    case 'trade_open':
      return settings.notifyOnTradeOpen === 1;
    case 'trade_close':
      return settings.notifyOnTradeClose === 1;
    case 'stop_loss':
      return settings.notifyOnStopLoss === 1;
    case 'take_profit':
      return settings.notifyOnTakeProfit === 1;
    case 'daily_loss_limit':
      return settings.notifyOnDailyLossLimit === 1;
    default:
      return false;
  }
}

/**
 * Format notification message for Telegram
 */
function formatNotificationMessage(notification: TradeNotification): string {
  const emoji = getEmojiForType(notification.type);
  const timestamp = new Date().toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' });

  let message = `${emoji} *Trading Llama AI*\n\n`;
  message += `📅 ${timestamp}\n\n`;
  message += notification.message;

  if (notification.symbol) {
    message += `\n\n💱 الزوج: *${notification.symbol}*`;
  }

  if (notification.price) {
    message += `\n💰 السعر: *$${notification.price.toFixed(2)}*`;
  }

  if (notification.pnl !== undefined) {
    const pnlEmoji = notification.pnl >= 0 ? '📈' : '📉';
    const pnlSign = notification.pnl >= 0 ? '+' : '';
    message += `\n${pnlEmoji} الربح/الخسارة: *${pnlSign}$${notification.pnl.toFixed(2)}*`;
  }

  return message;
}

/**
 * Get emoji for notification type
 */
function getEmojiForType(type: TradeNotification['type']): string {
  switch (type) {
    case 'trade_open':
      return '🚀';
    case 'trade_close':
      return '✅';
    case 'stop_loss':
      return '🛑';
    case 'take_profit':
      return '🎯';
    case 'daily_loss_limit':
      return '⚠️';
    default:
      return '📢';
  }
}

/**
 * Get or create Telegram settings for user
 */
export async function getTelegramSettings(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const settings = await db
    .select()
    .from(telegramSettings)
    .where(eq(telegramSettings.userId, userId))
    .limit(1);

  if (settings.length > 0) {
    return settings[0];
  }

  // Create default settings
  await db.insert(telegramSettings).values({
    userId,
    enabled: 0, // Disabled by default until user configures
  });

  return await db
    .select()
    .from(telegramSettings)
    .where(eq(telegramSettings.userId, userId))
    .limit(1)
    .then((rows) => rows[0]);
}

/**
 * Update Telegram settings
 */
export async function updateTelegramSettings(
  userId: number,
  updates: Partial<{
    chatId: string;
    enabled: number;
    notifyOnTradeOpen: number;
    notifyOnTradeClose: number;
    notifyOnStopLoss: number;
    notifyOnTakeProfit: number;
    notifyOnDailyLossLimit: number;
  }>
) {
  const db = await getDb();
  if (!db) return false;

  await db
    .update(telegramSettings)
    .set(updates)
    .where(eq(telegramSettings.userId, userId));

  return true;
}
