import ccxt from 'ccxt';
import { decryptApiKeys } from '../utils/encryption';
import { ApiKey } from '../../drizzle/schema';

/**
 * OKX Exchange Service
 * Handles all interactions with the OKX exchange using ccxt library
 */

export interface OHLCVData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TickerData {
  symbol: string;
  last: number;
  bid: number;
  ask: number;
  high: number;
  low: number;
  volume: number;
  timestamp: number;
}

export interface BalanceData {
  currency: string;
  free: number;
  used: number;
  total: number;
}

/**
 * Create an authenticated OKX exchange instance
 */
export function createOKXInstance(apiKey: ApiKey): any {
  const decrypted = decryptApiKeys(apiKey.apiKey, apiKey.secretKey, apiKey.passphrase);
  
  return new ccxt.okx({
    apiKey: decrypted.apiKey,
    secret: decrypted.secretKey,
    password: decrypted.passphrase,
    enableRateLimit: true, // Important: respect exchange rate limits
    options: {
      defaultType: 'spot', // Default to spot trading
    },
  });
}

/**
 * Test connection to OKX exchange
 * @param apiKey - The API key object from database
 * @returns True if connection is successful, false otherwise
 */
export async function testOKXConnection(apiKey: ApiKey): Promise<boolean> {
  try {
    const exchange = createOKXInstance(apiKey);
    await exchange.fetchBalance();
    return true;
  } catch (error) {
    console.error('[OKX] Connection test failed:', error);
    return false;
  }
}

/**
 * Fetch OHLCV (candlestick) data from OKX
 * @param apiKey - The API key object from database
 * @param symbol - Trading pair symbol (e.g., 'BTC/USDT')
 * @param timeframe - Timeframe (e.g., '1m', '5m', '15m', '1h', '4h', '1d')
 * @param since - Start timestamp in milliseconds (optional)
 * @param limit - Number of candles to fetch (default: 100, max: 300)
 * @returns Array of OHLCV data
 */
export async function fetchOHLCV(
  apiKey: ApiKey,
  symbol: string,
  timeframe: string = '1h',
  since?: number,
  limit: number = 100
): Promise<OHLCVData[]> {
  try {
    const exchange = createOKXInstance(apiKey);
    const ohlcv = await exchange.fetchOHLCV(symbol, timeframe, since, limit);
    
    return ohlcv.map((candle: any) => ({
      timestamp: candle[0],
      open: candle[1],
      high: candle[2],
      low: candle[3],
      close: candle[4],
      volume: candle[5],
    }));
  } catch (error) {
    console.error('[OKX] Failed to fetch OHLCV:', error);
    throw error;
  }
}

/**
 * Fetch current ticker data for a symbol
 * @param apiKey - The API key object from database
 * @param symbol - Trading pair symbol (e.g., 'BTC/USDT')
 * @returns Current ticker data
 */
export async function fetchTicker(apiKey: ApiKey, symbol: string): Promise<TickerData> {
  try {
    const exchange = createOKXInstance(apiKey);
    const ticker = await exchange.fetchTicker(symbol);
    
    return {
      symbol: ticker.symbol,
      last: ticker.last || 0,
      bid: ticker.bid || 0,
      ask: ticker.ask || 0,
      high: ticker.high || 0,
      low: ticker.low || 0,
      volume: ticker.baseVolume || 0,
      timestamp: ticker.timestamp || Date.now(),
    };
  } catch (error) {
    console.error('[OKX] Failed to fetch ticker:', error);
    throw error;
  }
}

/**
 * Fetch account balance
 * @param apiKey - The API key object from database
 * @returns Array of balance data for all currencies
 */
export async function fetchBalance(apiKey: ApiKey): Promise<BalanceData[]> {
  try {
    const exchange = createOKXInstance(apiKey);
    
    // OKX has different account types: spot, funding, trading
    // We need to fetch balance from the trading account specifically
    const balance = await exchange.fetchBalance({ type: 'spot' });
    
    console.log('[OKX] Raw balance response:', JSON.stringify(balance, null, 2));
    
    const balances: BalanceData[] = [];
    
    // The balance object structure from ccxt:
    // balance.free = { BTC: 0.001, USDT: 99.75, ... }
    // balance.used = { BTC: 0, USDT: 0, ... }
    // balance.total = { BTC: 0.001, USDT: 99.75, ... }
    
    if (balance.total) {
      for (const [currency, totalAmount] of Object.entries(balance.total)) {
        const total = Number(totalAmount) || 0;
        const free = Number(balance.free?.[currency]) || 0;
        const used = Number(balance.used?.[currency]) || 0;
        
        // Only include currencies with non-zero balance
        if (total > 0) {
          balances.push({
            currency,
            free,
            used,
            total,
          });
        }
      }
    }
    
    console.log('[OKX] Parsed balances:', balances);
    
    return balances;
  } catch (error) {
    console.error('[OKX] Failed to fetch balance:', error);
    throw error;
  }
}

/**
 * Fetch all available markets from OKX
 * @param apiKey - The API key object from database
 * @returns Array of market symbols
 */
export async function fetchMarkets(apiKey: ApiKey): Promise<string[]> {
  try {
    const exchange = createOKXInstance(apiKey);
    const markets = await exchange.fetchMarkets();
    
    return markets
      .filter((market: any) => market.active && market.spot)
      .map((market: any) => market.symbol);
  } catch (error) {
    console.error('[OKX] Failed to fetch markets:', error);
    throw error;
  }
}

/**
 * Place a market order (for future implementation)
 * @param apiKey - The API key object from database
 * @param symbol - Trading pair symbol
 * @param side - 'buy' or 'sell'
 * @param amount - Amount to trade
 * @returns Order result
 */
export async function placeMarketOrder(
  apiKey: ApiKey,
  symbol: string,
  side: 'buy' | 'sell',
  amount: number
): Promise<any> {
  try {
    const exchange = createOKXInstance(apiKey);
    const order = await exchange.createMarketOrder(symbol, side, amount);
    return order;
  } catch (error) {
    console.error('[OKX] Failed to place market order:', error);
    throw error;
  }
}

/**
 * Place a limit order (for future implementation)
 * @param apiKey - The API key object from database
 * @param symbol - Trading pair symbol
 * @param side - 'buy' or 'sell'
 * @param amount - Amount to trade
 * @param price - Limit price
 * @returns Order result
 */
export async function placeLimitOrder(
  apiKey: ApiKey,
  symbol: string,
  side: 'buy' | 'sell',
  amount: number,
  price: number
): Promise<any> {
  try {
    const exchange = createOKXInstance(apiKey);
    const order = await exchange.createLimitOrder(symbol, side, amount, price);
    return order;
  } catch (error) {
    console.error('[OKX] Failed to place limit order:', error);
    throw error;
  }
}
