/**
 * Real Technical Indicators Service
 * Calculates actual technical indicators using Python TA-Lib
 */

import { spawn } from 'child_process';
import path from 'path';

export interface RealIndicators {
  rsi: number | null;
  macd: {
    macd: number | null;
    signal: number | null;
    histogram: number | null;
  };
  bollinger_bands: {
    upper: number | null;
    middle: number | null;
    lower: number | null;
  };
  atr: number | null;
  stochastic: {
    k: number | null;
    d: number | null;
  };
  moving_averages: {
    sma_20: number | null;
    sma_50: number | null;
    ema_20: number | null;
    ema_50: number | null;
  };
  trend: 'uptrend' | 'downtrend' | 'sideways' | null;
  support: number | null;
  resistance: number | null;
  current_price: number;
}

/**
 * Calculate real technical indicators from OHLCV data using Python TA-Lib
 * @param ohlcv Array of [timestamp, open, high, low, close, volume]
 * @returns Real calculated indicators
 */
export async function calculateRealIndicators(
  ohlcv: number[][]
): Promise<RealIndicators> {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, '../python/calculate_indicators.py');
    
    const python = spawn('python3', [pythonScript]);
    
    let stdout = '';
    let stderr = '';
    
    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    python.on('close', (code) => {
      if (code !== 0) {
        console.error('[Real Indicators] Python script failed:', stderr);
        reject(new Error(`Python script exited with code ${code}: ${stderr}`));
        return;
      }
      
      try {
        const result = JSON.parse(stdout);
        
        if (!result.success) {
          reject(new Error(result.error));
          return;
        }
        
        resolve(result.indicators);
      } catch (error) {
        console.error('[Real Indicators] Failed to parse Python output:', stdout);
        reject(error);
      }
    });
    
    // Send OHLCV data to Python script via stdin
    python.stdin.write(JSON.stringify({ ohlcv }));
    python.stdin.end();
  });
}

/**
 * Fetch OHLCV data and calculate real indicators
 * @param symbol Trading pair symbol
 * @param timeframe Timeframe (e.g., '15m', '1h')
 * @param limit Number of candles to fetch
 */
export async function fetchAndCalculateIndicators(
  userId: number,
  symbol: string,
  timeframe: string = '15m',
  limit: number = 100
): Promise<RealIndicators> {
  try {
    // Import database and OKX service
    const { getActiveApiKey } = await import('../db');
    const { createOKXInstance } = await import('./okxService');
    
    // Get user's API key
    const apiKey = await getActiveApiKey(userId, 'okx');
    if (!apiKey) {
      throw new Error('No active API key found');
    }
    
    // Create OKX instance
    const exchange = createOKXInstance(apiKey);
    
    // Fetch OHLCV data from OKX
    const ohlcv = await exchange.fetchOHLCV(symbol, timeframe, limit);
    
    // Convert to number[][] format (ccxt returns [timestamp, open, high, low, close, volume])
    const ohlcvNumbers: number[][] = ohlcv.map((candle: any) => [
      candle[0], // timestamp
      candle[1], // open
      candle[2], // high
      candle[3], // low
      candle[4], // close
      candle[5]  // volume
    ]);
    
    // Calculate real indicators
    const indicators = await calculateRealIndicators(ohlcvNumbers);
    
    return indicators;
  } catch (error) {
    console.error('[Real Indicators] Error fetching and calculating:', error);
    throw error;
  }
}
