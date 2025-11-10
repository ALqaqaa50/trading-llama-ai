/**
 * Candlestick Pattern Recognition Module
 * Implements Japanese candlestick pattern detection based on Steve Nison's techniques
 */

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PatternResult {
  pattern: string;
  type: 'bullish' | 'bearish' | 'neutral';
  confidence: number; // 0-100
  description: string;
}

/**
 * Calculate candle body size
 */
function getBodySize(candle: Candle): number {
  return Math.abs(candle.close - candle.open);
}

/**
 * Calculate upper shadow size
 */
function getUpperShadow(candle: Candle): number {
  return candle.high - Math.max(candle.open, candle.close);
}

/**
 * Calculate lower shadow size
 */
function getLowerShadow(candle: Candle): number {
  return Math.min(candle.open, candle.close) - candle.low;
}

/**
 * Check if candle is bullish
 */
function isBullish(candle: Candle): boolean {
  return candle.close > candle.open;
}

/**
 * Check if candle is bearish
 */
function isBearish(candle: Candle): boolean {
  return candle.close < candle.open;
}

/**
 * Get candle range (high - low)
 */
function getRange(candle: Candle): number {
  return candle.high - candle.low;
}

/**
 * Detect Doji pattern
 * Small body with upper and lower shadows
 */
export function detectDoji(candle: Candle): PatternResult | null {
  const bodySize = getBodySize(candle);
  const range = getRange(candle);
  
  if (bodySize / range < 0.1) {
    return {
      pattern: 'Doji',
      type: 'neutral',
      confidence: 80,
      description: 'نمط دوجي - يشير إلى تردد السوق وإمكانية انعكاس الاتجاه',
    };
  }
  
  return null;
}

/**
 * Detect Hammer pattern
 * Small body at top, long lower shadow, little to no upper shadow
 */
export function detectHammer(candle: Candle, trend: 'uptrend' | 'downtrend'): PatternResult | null {
  const bodySize = getBodySize(candle);
  const lowerShadow = getLowerShadow(candle);
  const upperShadow = getUpperShadow(candle);
  const range = getRange(candle);
  
  // Lower shadow should be at least 2x body size
  // Upper shadow should be minimal
  if (
    lowerShadow >= bodySize * 2 &&
    upperShadow < bodySize * 0.5 &&
    bodySize / range < 0.3 &&
    trend === 'downtrend'
  ) {
    return {
      pattern: 'Hammer',
      type: 'bullish',
      confidence: 75,
      description: 'نمط المطرقة - إشارة انعكاس صعودي قوية في نهاية الاتجاه الهابط',
    };
  }
  
  return null;
}

/**
 * Detect Shooting Star pattern
 * Small body at bottom, long upper shadow, little to no lower shadow
 */
export function detectShootingStar(candle: Candle, trend: 'uptrend' | 'downtrend'): PatternResult | null {
  const bodySize = getBodySize(candle);
  const upperShadow = getUpperShadow(candle);
  const lowerShadow = getLowerShadow(candle);
  const range = getRange(candle);
  
  if (
    upperShadow >= bodySize * 2 &&
    lowerShadow < bodySize * 0.5 &&
    bodySize / range < 0.3 &&
    trend === 'uptrend'
  ) {
    return {
      pattern: 'Shooting Star',
      type: 'bearish',
      confidence: 75,
      description: 'نمط النجمة الساقطة - إشارة انعكاس هبوطي في نهاية الاتجاه الصاعد',
    };
  }
  
  return null;
}

/**
 * Detect Engulfing pattern (Bullish or Bearish)
 */
export function detectEngulfing(candle1: Candle, candle2: Candle): PatternResult | null {
  const body1 = getBodySize(candle1);
  const body2 = getBodySize(candle2);
  
  // Bullish Engulfing: bearish candle followed by larger bullish candle
  if (
    isBearish(candle1) &&
    isBullish(candle2) &&
    candle2.open < candle1.close &&
    candle2.close > candle1.open &&
    body2 > body1
  ) {
    return {
      pattern: 'Bullish Engulfing',
      type: 'bullish',
      confidence: 85,
      description: 'نمط الابتلاع الصعودي - إشارة انعكاس صعودي قوية',
    };
  }
  
  // Bearish Engulfing: bullish candle followed by larger bearish candle
  if (
    isBullish(candle1) &&
    isBearish(candle2) &&
    candle2.open > candle1.close &&
    candle2.close < candle1.open &&
    body2 > body1
  ) {
    return {
      pattern: 'Bearish Engulfing',
      type: 'bearish',
      confidence: 85,
      description: 'نمط الابتلاع الهبوطي - إشارة انعكاس هبوطي قوية',
    };
  }
  
  return null;
}

/**
 * Detect Morning Star pattern (3 candles)
 * Bearish candle, small body (star), bullish candle
 */
export function detectMorningStar(candle1: Candle, candle2: Candle, candle3: Candle): PatternResult | null {
  const body1 = getBodySize(candle1);
  const body2 = getBodySize(candle2);
  const body3 = getBodySize(candle3);
  
  if (
    isBearish(candle1) &&
    body2 < body1 * 0.5 && // Star has small body
    isBullish(candle3) &&
    candle3.close > (candle1.open + candle1.close) / 2 // Third candle closes above midpoint of first
  ) {
    return {
      pattern: 'Morning Star',
      type: 'bullish',
      confidence: 90,
      description: 'نمط نجمة الصباح - إشارة انعكاس صعودي قوية جداً (3 شموع)',
    };
  }
  
  return null;
}

/**
 * Detect Evening Star pattern (3 candles)
 * Bullish candle, small body (star), bearish candle
 */
export function detectEveningStar(candle1: Candle, candle2: Candle, candle3: Candle): PatternResult | null {
  const body1 = getBodySize(candle1);
  const body2 = getBodySize(candle2);
  const body3 = getBodySize(candle3);
  
  if (
    isBullish(candle1) &&
    body2 < body1 * 0.5 &&
    isBearish(candle3) &&
    candle3.close < (candle1.open + candle1.close) / 2
  ) {
    return {
      pattern: 'Evening Star',
      type: 'bearish',
      confidence: 90,
      description: 'نمط نجمة المساء - إشارة انعكاس هبوطي قوية جداً (3 شموع)',
    };
  }
  
  return null;
}

/**
 * Detect Three White Soldiers pattern
 * Three consecutive bullish candles with higher closes
 */
export function detectThreeWhiteSoldiers(candle1: Candle, candle2: Candle, candle3: Candle): PatternResult | null {
  if (
    isBullish(candle1) &&
    isBullish(candle2) &&
    isBullish(candle3) &&
    candle2.close > candle1.close &&
    candle3.close > candle2.close &&
    candle2.open > candle1.open &&
    candle2.open < candle1.close &&
    candle3.open > candle2.open &&
    candle3.open < candle2.close
  ) {
    return {
      pattern: 'Three White Soldiers',
      type: 'bullish',
      confidence: 85,
      description: 'نمط الجنود البيض الثلاثة - إشارة استمرار صعودي قوية',
    };
  }
  
  return null;
}

/**
 * Detect Three Black Crows pattern
 * Three consecutive bearish candles with lower closes
 */
export function detectThreeBlackCrows(candle1: Candle, candle2: Candle, candle3: Candle): PatternResult | null {
  if (
    isBearish(candle1) &&
    isBearish(candle2) &&
    isBearish(candle3) &&
    candle2.close < candle1.close &&
    candle3.close < candle2.close &&
    candle2.open < candle1.open &&
    candle2.open > candle1.close &&
    candle3.open < candle2.open &&
    candle3.open > candle2.close
  ) {
    return {
      pattern: 'Three Black Crows',
      type: 'bearish',
      confidence: 85,
      description: 'نمط الغربان السوداء الثلاثة - إشارة استمرار هبوطي قوية',
    };
  }
  
  return null;
}

/**
 * Detect Piercing Line pattern
 * Bearish candle followed by bullish candle that closes above midpoint
 */
export function detectPiercingLine(candle1: Candle, candle2: Candle): PatternResult | null {
  const midpoint = (candle1.open + candle1.close) / 2;
  
  if (
    isBearish(candle1) &&
    isBullish(candle2) &&
    candle2.open < candle1.low &&
    candle2.close > midpoint &&
    candle2.close < candle1.open
  ) {
    return {
      pattern: 'Piercing Line',
      type: 'bullish',
      confidence: 80,
      description: 'نمط الخط الثاقب - إشارة انعكاس صعودي محتملة',
    };
  }
  
  return null;
}

/**
 * Detect Dark Cloud Cover pattern
 * Bullish candle followed by bearish candle that closes below midpoint
 */
export function detectDarkCloudCover(candle1: Candle, candle2: Candle): PatternResult | null {
  const midpoint = (candle1.open + candle1.close) / 2;
  
  if (
    isBullish(candle1) &&
    isBearish(candle2) &&
    candle2.open > candle1.high &&
    candle2.close < midpoint &&
    candle2.close > candle1.open
  ) {
    return {
      pattern: 'Dark Cloud Cover',
      type: 'bearish',
      confidence: 80,
      description: 'نمط الغيمة السوداء - إشارة انعكاس هبوطي محتملة',
    };
  }
  
  return null;
}

/**
 * Analyze candles and detect all patterns
 */
export function analyzePatterns(
  candles: Candle[],
  trend: 'uptrend' | 'downtrend' | 'sideways'
): PatternResult[] {
  const patterns: PatternResult[] = [];
  const len = candles.length;
  
  if (len < 1) return patterns;
  
  // Single candle patterns
  const lastCandle = candles[len - 1];
  
  const doji = detectDoji(lastCandle);
  if (doji) patterns.push(doji);
  
  if (trend !== 'sideways') {
    const hammer = detectHammer(lastCandle, trend);
    if (hammer) patterns.push(hammer);
    
    const shootingStar = detectShootingStar(lastCandle, trend);
    if (shootingStar) patterns.push(shootingStar);
  }
  
  // Two candle patterns
  if (len >= 2) {
    const engulfing = detectEngulfing(candles[len - 2], candles[len - 1]);
    if (engulfing) patterns.push(engulfing);
    
    const piercing = detectPiercingLine(candles[len - 2], candles[len - 1]);
    if (piercing) patterns.push(piercing);
    
    const darkCloud = detectDarkCloudCover(candles[len - 2], candles[len - 1]);
    if (darkCloud) patterns.push(darkCloud);
  }
  
  // Three candle patterns
  if (len >= 3) {
    const morningStar = detectMorningStar(candles[len - 3], candles[len - 2], candles[len - 1]);
    if (morningStar) patterns.push(morningStar);
    
    const eveningStar = detectEveningStar(candles[len - 3], candles[len - 2], candles[len - 1]);
    if (eveningStar) patterns.push(eveningStar);
    
    const whiteSoldiers = detectThreeWhiteSoldiers(candles[len - 3], candles[len - 2], candles[len - 1]);
    if (whiteSoldiers) patterns.push(whiteSoldiers);
    
    const blackCrows = detectThreeBlackCrows(candles[len - 3], candles[len - 2], candles[len - 1]);
    if (blackCrows) patterns.push(blackCrows);
  }
  
  return patterns;
}
