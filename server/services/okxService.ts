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
 * Fetch account balance from ALL OKX accounts (Funding + Trading + Futures)
 * @param apiKey - The API key object from database
 * @returns Array of balance data for each currency (aggregated from all accounts)
 */
export async function fetchBalance(apiKey: ApiKey): Promise<BalanceData[]> {
  try {
    const exchange = createOKXInstance(apiKey);
    
    // OKX has two account modes:
    // 1. Classic Account: separate accounts (funding, spot, swap, etc.)
    // 2. Unified Account: all balances in one unified trading account
    
    // Strategy: Try all possible account types and aggregate
    const accountTypes = [
      'trading',  // Unified Trading Account (new OKX system)
      'spot',     // Spot Trading Account
      'funding',  // Funding Account (deposits/withdrawals)
      'swap',     // Futures/Perpetual Swap
      'future',   // Futures
      'margin'    // Margin Trading
    ];
    
    const aggregatedBalances: { [currency: string]: { free: number; used: number; total: number } } = {};
    
    console.log('[OKX] Fetching balances from all account types (including Unified Account)...');
    
    // Fetch balance from each account type
    for (const accountType of accountTypes) {
      try {
        console.log(`[OKX] Attempting to fetch balance from ${accountType} account...`);
        const balance = await exchange.fetchBalance({ type: accountType });
        
        console.log(`[OKX] ${accountType} account raw response:`, JSON.stringify(balance, null, 2).substring(0, 500));
        
        // Aggregate balances from this account type
        if (balance.total) {
          for (const [currency, totalAmount] of Object.entries(balance.total)) {
            const total = Number(totalAmount) || 0;
            const free = Number(balance.free?.[currency]) || 0;
            const used = Number(balance.used?.[currency]) || 0;
            
            if (total > 0) {
              console.log(`[OKX] Found ${total} ${currency} in ${accountType} account (free: ${free}, used: ${used})`);
              
              if (!aggregatedBalances[currency]) {
                aggregatedBalances[currency] = { free: 0, used: 0, total: 0 };
              }
              
              aggregatedBalances[currency].free += free;
              aggregatedBalances[currency].used += used;
              aggregatedBalances[currency].total += total;
            }
          }
        }
      } catch (error: any) {
        // Some account types might not be accessible or enabled
        console.log(`[OKX] Could not fetch ${accountType} balance:`, error.message);
      }
    }
    
    // Convert aggregated balances to array
    const balances: BalanceData[] = Object.entries(aggregatedBalances).map(([currency, amounts]) => ({
      currency,
      free: amounts.free,
      used: amounts.used,
      total: amounts.total,
    }));
    
    console.log('[OKX] ✅ Total aggregated balances from ALL accounts:', balances);
    
    if (balances.length === 0) {
      console.warn('[OKX] ⚠️ No balances found in any account type! This might indicate:');
      console.warn('[OKX]    1. Account is empty');
      console.warn('[OKX]    2. API keys lack "Read" permission');
      console.warn('[OKX]    3. Account type mismatch (Unified vs Classic)');
    }
    
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

/**
 * Transfer funds between OKX accounts
 * @param apiKey - The API key object from database
 * @param currency - Currency to transfer (e.g., 'USDT')
 * @param amount - Amount to transfer
 * @param from - Source account type ('funding', 'spot', 'swap', etc.)
 * @param to - Destination account type
 * @returns Transfer result
 */
export async function transferFunds(
  apiKey: ApiKey,
  currency: string,
  amount: number,
  from: string,
  to: string
): Promise<any> {
  try {
    const exchange = createOKXInstance(apiKey);
    
    console.log(`[OKX] Transferring ${amount} ${currency} from ${from} to ${to}...`);
    
    // OKX transfer API
    // Account type mapping for OKX API:
    // '6' = Funding Account
    // '18' = Spot Trading Account
    // '1' = Futures Account
    // '3' = Margin Account
    // '5' = Swap Account
    
    const accountTypeMap: { [key: string]: string } = {
      'funding': '6',
      'spot': '18',
      'future': '1',
      'margin': '3',
      'swap': '5',
    };
    
    const fromType = accountTypeMap[from];
    const toType = accountTypeMap[to];
    
    if (!fromType || !toType) {
      throw new Error(`Invalid account type: from=${from}, to=${to}`);
    }
    
    const result = await exchange.transfer(currency, amount, fromType, toType);
    
    console.log('[OKX] Transfer successful:', result);
    
    return result;
  } catch (error) {
    console.error('[OKX] Failed to transfer funds:', error);
    throw error;
  }
}

/**
 * Automatically transfer all available funds from Funding Account to Spot Trading Account
 * This ensures maximum available balance for trading
 * @param apiKey - The API key object from database
 * @returns Transfer results for each currency
 */
export async function autoTransferToSpot(apiKey: ApiKey): Promise<any[]> {
  try {
    const exchange = createOKXInstance(apiKey);
    
    console.log('[OKX] Checking Funding Account for available funds to transfer...');
    
    // Fetch balance from Funding Account only
    const fundingBalance = await exchange.fetchBalance({ type: 'funding' });
    
    const transfers: any[] = [];
    
    if (fundingBalance.free) {
      for (const [currency, freeAmount] of Object.entries(fundingBalance.free)) {
        const amount = Number(freeAmount) || 0;
        
        // Only transfer if there's a meaningful amount (> 0.01 for most currencies)
        if (amount > 0.01) {
          try {
            console.log(`[OKX] Found ${amount} ${currency} in Funding Account, transferring to Spot...`);
            
            const transferResult = await transferFunds(apiKey, currency, amount, 'funding', 'spot');
            
            transfers.push({
              currency,
              amount,
              status: 'success',
              result: transferResult,
            });
          } catch (error: any) {
            console.error(`[OKX] Failed to transfer ${currency}:`, error.message);
            transfers.push({
              currency,
              amount,
              status: 'failed',
              error: error.message,
            });
          }
        }
      }
    }
    
    if (transfers.length === 0) {
      console.log('[OKX] No funds found in Funding Account to transfer');
    } else {
      console.log(`[OKX] Completed ${transfers.length} transfers from Funding to Spot`);
    }
    
    return transfers;
  } catch (error) {
    console.error('[OKX] Failed to auto-transfer funds:', error);
    throw error;
  }
}
