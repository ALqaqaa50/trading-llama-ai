import ccxt from 'ccxt';
import { getApiKeysByUserId } from '../db';
import { decrypt } from '../utils/encryption';
import { getApiKeys } from '../apiKeyDb';
import { createTradingClient } from '../okx-trading';

/**
 * OKX Trading Service - Automatic Trade Execution
 * Handles order placement, position management, and trade tracking
 */

export interface TradeOrder {
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop_loss' | 'take_profit';
  amount: number;
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
  leverage?: number;
  marginMode?: 'isolated' | 'cross';
}

export interface TradeResult {
  success: boolean;
  orderId?: string;
  symbol: string;
  side: string;
  amount: number;
  price?: number;
  status: string;
  timestamp: Date;
  error?: string;
}

export interface Position {
  symbol: string;
  side: 'long' | 'short';
  amount: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  leverage: number;
  liquidationPrice?: number;
}

/**
 * Create OKX exchange instance with user credentials
 */
async function createOKXInstance(userId: number): Promise<any> {
  const apiKeys = await getApiKeysByUserId(userId);
  const apiKey = apiKeys && apiKeys.length > 0 ? apiKeys[0] : null;
  
  if (!apiKey || !apiKey.isActive) {
    throw new Error('No active API key found for user');
  }

  const decryptedApiKey = decrypt(apiKey.apiKey);
  const decryptedSecretKey = decrypt(apiKey.secretKey);
  const decryptedPassphrase = apiKey.passphrase ? decrypt(apiKey.passphrase) : '';

  const exchange = new ccxt.okx({
    apiKey: decryptedApiKey,
    secret: decryptedSecretKey,
    password: decryptedPassphrase,
    enableRateLimit: true,
    options: {
      defaultType: 'swap', // Use perpetual swaps by default
    },
  });

  return exchange;
}

/**
 * Place a trade order on OKX
 */
export async function placeOrder(userId: number, order: TradeOrder): Promise<TradeResult> {
  try {
    const exchange = await createOKXInstance(userId);

    // Set leverage if specified
    if (order.leverage) {
      await exchange.setLeverage(order.leverage, order.symbol);
    }

    // Set margin mode if specified
    if (order.marginMode) {
      await exchange.setMarginMode(order.marginMode, order.symbol);
    }

    let result;

    if (order.type === 'market') {
      // Market order
      result = await exchange.createOrder(
        order.symbol,
        'market',
        order.side,
        order.amount
      );
    } else if (order.type === 'limit') {
      // Limit order
      if (!order.price) {
        throw new Error('Price is required for limit orders');
      }
      result = await exchange.createOrder(
        order.symbol,
        'limit',
        order.side,
        order.amount,
        order.price
      );
    }

    // Place stop-loss order if specified
    if (order.stopLoss && result) {
      await exchange.createOrder(
        order.symbol,
        'stop',
        order.side === 'buy' ? 'sell' : 'buy',
        order.amount,
        order.stopLoss,
        {
          stopPrice: order.stopLoss,
          triggerType: 'mark_price',
        }
      );
    }

    // Place take-profit order if specified
    if (order.takeProfit && result) {
      await exchange.createOrder(
        order.symbol,
        'limit',
        order.side === 'buy' ? 'sell' : 'buy',
        order.amount,
        order.takeProfit,
        {
          stopPrice: order.takeProfit,
          triggerType: 'mark_price',
        }
      );
    }

    // Verify the order was actually placed successfully
    if (!result || !result.id) {
      return {
        success: false,
        symbol: order.symbol,
        side: order.side,
        amount: order.amount,
        status: 'failed',
        timestamp: new Date(),
        error: 'Order was not created - no order ID returned from exchange',
      };
    }

    // Check if order status indicates success
    const successStatuses = ['closed', 'filled', 'open'];
    const orderStatus = result.status || 'unknown';
    
    if (!successStatuses.includes(orderStatus.toLowerCase())) {
      // Provide more helpful error message for common issues
      let errorMessage = `Order failed with status: ${orderStatus}`;
      
      if (orderStatus === 'unknown') {
        errorMessage = 'Order failed - API key may not have "Trade" permission. Please enable Trading permission in your OKX API settings.';
      }
      
      return {
        success: false,
        orderId: result.id,
        symbol: order.symbol,
        side: order.side,
        amount: order.amount,
        status: orderStatus,
        timestamp: new Date(),
        error: errorMessage,
      };
    }

    return {
      success: true,
      orderId: result.id,
      symbol: order.symbol,
      side: order.side,
      amount: order.amount,
      price: result.price || result.average,
      status: orderStatus,
      timestamp: new Date(),
    };
  } catch (error: any) {
    console.error('Error placing order:', error);
    return {
      success: false,
      symbol: order.symbol,
      side: order.side,
      amount: order.amount,
      status: 'failed',
      timestamp: new Date(),
      error: error.message,
    };
  }
}

/**
 * Get all open positions
 */
export async function getOpenPositions(userId: number, symbol?: string): Promise<Position[]> {
  try {
    const exchange = await createOKXInstance(userId);
    
    const positions = await exchange.fetchPositions(symbol ? [symbol] : undefined);
    
    return positions
      .filter((pos: any) => parseFloat(pos.contracts || '0') > 0)
      .map((pos: any) => ({
        symbol: pos.symbol,
        side: pos.side === 'long' ? 'long' : 'short',
        amount: parseFloat(pos.contracts || '0'),
        entryPrice: parseFloat(pos.entryPrice || '0'),
        currentPrice: parseFloat(pos.markPrice || '0'),
        unrealizedPnl: parseFloat(pos.unrealizedPnl || '0'),
        unrealizedPnlPercent: parseFloat(pos.percentage || '0'),
        leverage: parseFloat(pos.leverage || '1'),
        liquidationPrice: pos.liquidationPrice ? parseFloat(pos.liquidationPrice) : undefined,
      }));
  } catch (error: any) {
    console.error('Error fetching positions:', error);
    return [];
  }
}

/**
 * Close a position (market order)
 */
export async function closePosition(
  userId: number,
  symbol: string,
  amount?: number
): Promise<TradeResult> {
  try {
    const exchange = await createOKXInstance(userId);
    
    // Get current position to determine side
    const positions = await getOpenPositions(userId, symbol);
    const position = positions.find(p => p.symbol === symbol);
    
    if (!position) {
      throw new Error('No open position found for this symbol');
    }

    const closeAmount = amount || position.amount;
    const closeSide = position.side === 'long' ? 'sell' : 'buy';

    const result = await exchange.createOrder(
      symbol,
      'market',
      closeSide,
      closeAmount,
      undefined,
      {
        reduceOnly: true, // Ensure this order only reduces position
      }
    );

    return {
      success: true,
      orderId: result.id,
      symbol,
      side: closeSide,
      amount: closeAmount,
      price: result.price,
      status: result.status,
      timestamp: new Date(),
    };
  } catch (error: any) {
    console.error('Error closing position:', error);
    return {
      success: false,
      symbol,
      side: 'sell',
      amount: amount || 0,
      status: 'failed',
      timestamp: new Date(),
      error: error.message,
    };
  }
}

/**
 * Get order status
 */
export async function getOrderStatus(
  userId: number,
  orderId: string,
  symbol: string
): Promise<any> {
  try {
    const exchange = await createOKXInstance(userId);
    const order = await exchange.fetchOrder(orderId, symbol);
    
    return {
      id: order.id,
      symbol: order.symbol,
      type: order.type,
      side: order.side,
      price: order.price,
      amount: order.amount,
      filled: order.filled,
      remaining: order.remaining,
      status: order.status,
      timestamp: order.timestamp,
    };
  } catch (error: any) {
    console.error('Error fetching order status:', error);
    throw error;
  }
}

/**
 * Cancel an order
 */
export async function cancelOrder(
  userId: number,
  orderId: string,
  symbol: string
): Promise<boolean> {
  try {
    const exchange = await createOKXInstance(userId);
    await exchange.cancelOrder(orderId, symbol);
    return true;
  } catch (error: any) {
    console.error('Error canceling order:', error);
    return false;
  }
}

/**
 * Get account balance
 */
export async function getAccountBalance(userId: number): Promise<any> {
  try {
    const exchange = await createOKXInstance(userId);
    const balance = await exchange.fetchBalance();
    
    return {
      total: balance.total,
      free: balance.free,
      used: balance.used,
    };
  } catch (error: any) {
    console.error('Error fetching balance:', error);
    throw error;
  }
}
