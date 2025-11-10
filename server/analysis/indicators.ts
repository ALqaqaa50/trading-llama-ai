/**
 * Technical Indicators Module
 * Implements various technical analysis indicators for trading strategies
 */

export interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Calculate Simple Moving Average (SMA)
 * @param data - Array of prices
 * @param period - Period for SMA calculation
 * @returns Array of SMA values
 */
export function calculateSMA(data: number[], period: number): number[] {
  const result: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
      continue;
    }
    
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j];
    }
    result.push(sum / period);
  }
  
  return result;
}

/**
 * Calculate Exponential Moving Average (EMA)
 * @param data - Array of prices
 * @param period - Period for EMA calculation
 * @returns Array of EMA values
 */
export function calculateEMA(data: number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);
  
  // First EMA is SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    if (i < data.length) {
      sum += data[i];
    }
  }
  const firstEMA = sum / period;
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else if (i === period - 1) {
      result.push(firstEMA);
    } else {
      const ema = (data[i] - result[i - 1]) * multiplier + result[i - 1];
      result.push(ema);
    }
  }
  
  return result;
}

/**
 * Calculate Relative Strength Index (RSI)
 * @param data - Array of closing prices
 * @param period - Period for RSI calculation (default: 14)
 * @returns Array of RSI values (0-100)
 */
export function calculateRSI(data: number[], period: number = 14): number[] {
  const result: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];
  
  // Calculate price changes
  for (let i = 1; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }
  
  // Calculate RSI
  result.push(NaN); // First value is undefined
  
  for (let i = 0; i < gains.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
      continue;
    }
    
    let avgGain = 0;
    let avgLoss = 0;
    
    if (i === period - 1) {
      // First RSI calculation uses simple average
      for (let j = 0; j < period; j++) {
        avgGain += gains[i - j];
        avgLoss += losses[i - j];
      }
      avgGain /= period;
      avgLoss /= period;
    } else {
      // Subsequent calculations use smoothed average
      const prevAvgGain = (result[i] / 100) * (100 - result[i]) || 0;
      const prevAvgLoss = 100 - result[i] || 0;
      avgGain = (prevAvgGain * (period - 1) + gains[i]) / period;
      avgLoss = (prevAvgLoss * (period - 1) + losses[i]) / period;
    }
    
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    result.push(rsi);
  }
  
  return result;
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 * @param data - Array of closing prices
 * @param fastPeriod - Fast EMA period (default: 12)
 * @param slowPeriod - Slow EMA period (default: 26)
 * @param signalPeriod - Signal line period (default: 9)
 * @returns Object with MACD line, signal line, and histogram
 */
export function calculateMACD(
  data: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): { macd: number[]; signal: number[]; histogram: number[] } {
  const fastEMA = calculateEMA(data, fastPeriod);
  const slowEMA = calculateEMA(data, slowPeriod);
  
  // MACD line = Fast EMA - Slow EMA
  const macdLine = fastEMA.map((fast, i) => fast - slowEMA[i]);
  
  // Signal line = EMA of MACD line
  const signalLine = calculateEMA(macdLine.filter(v => !isNaN(v)), signalPeriod);
  
  // Pad signal line with NaN to match length
  const paddedSignal = new Array(macdLine.length - signalLine.length).fill(NaN).concat(signalLine);
  
  // Histogram = MACD - Signal
  const histogram = macdLine.map((macd, i) => macd - paddedSignal[i]);
  
  return {
    macd: macdLine,
    signal: paddedSignal,
    histogram,
  };
}

/**
 * Calculate Bollinger Bands
 * @param data - Array of closing prices
 * @param period - Period for calculation (default: 20)
 * @param stdDev - Number of standard deviations (default: 2)
 * @returns Object with upper, middle, and lower bands
 */
export function calculateBollingerBands(
  data: number[],
  period: number = 20,
  stdDev: number = 2
): { upper: number[]; middle: number[]; lower: number[] } {
  const middle = calculateSMA(data, period);
  const upper: number[] = [];
  const lower: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      upper.push(NaN);
      lower.push(NaN);
      continue;
    }
    
    // Calculate standard deviation
    const slice = data.slice(i - period + 1, i + 1);
    const mean = middle[i];
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
    const sd = Math.sqrt(variance);
    
    upper.push(mean + stdDev * sd);
    lower.push(mean - stdDev * sd);
  }
  
  return { upper, middle, lower };
}

/**
 * Calculate Average True Range (ATR)
 * @param candles - Array of candle data
 * @param period - Period for ATR calculation (default: 14)
 * @returns Array of ATR values
 */
export function calculateATR(candles: CandleData[], period: number = 14): number[] {
  const trueRanges: number[] = [];
  
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      trueRanges.push(candles[i].high - candles[i].low);
    } else {
      const tr = Math.max(
        candles[i].high - candles[i].low,
        Math.abs(candles[i].high - candles[i - 1].close),
        Math.abs(candles[i].low - candles[i - 1].close)
      );
      trueRanges.push(tr);
    }
  }
  
  // ATR is the EMA of true ranges
  return calculateEMA(trueRanges, period);
}

/**
 * Calculate Stochastic Oscillator
 * @param candles - Array of candle data
 * @param period - Period for calculation (default: 14)
 * @param smoothK - Smoothing period for %K (default: 3)
 * @param smoothD - Smoothing period for %D (default: 3)
 * @returns Object with %K and %D lines
 */
export function calculateStochastic(
  candles: CandleData[],
  period: number = 14,
  smoothK: number = 3,
  smoothD: number = 3
): { k: number[]; d: number[] } {
  const rawK: number[] = [];
  
  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      rawK.push(NaN);
      continue;
    }
    
    const slice = candles.slice(i - period + 1, i + 1);
    const high = Math.max(...slice.map(c => c.high));
    const low = Math.min(...slice.map(c => c.low));
    const close = candles[i].close;
    
    const k = ((close - low) / (high - low)) * 100;
    rawK.push(k);
  }
  
  // Smooth %K
  const k = calculateSMA(rawK, smoothK);
  
  // %D is SMA of %K
  const d = calculateSMA(k, smoothD);
  
  return { k, d };
}

/**
 * Detect trend direction
 * @param data - Array of prices
 * @param shortPeriod - Short MA period
 * @param longPeriod - Long MA period
 * @returns 'uptrend', 'downtrend', or 'sideways'
 */
export function detectTrend(
  data: number[],
  shortPeriod: number = 20,
  longPeriod: number = 50
): 'uptrend' | 'downtrend' | 'sideways' {
  const shortMA = calculateSMA(data, shortPeriod);
  const longMA = calculateSMA(data, longPeriod);
  
  const lastShort = shortMA[shortMA.length - 1];
  const lastLong = longMA[longMA.length - 1];
  
  if (isNaN(lastShort) || isNaN(lastLong)) {
    return 'sideways';
  }
  
  const diff = ((lastShort - lastLong) / lastLong) * 100;
  
  if (diff > 2) return 'uptrend';
  if (diff < -2) return 'downtrend';
  return 'sideways';
}
