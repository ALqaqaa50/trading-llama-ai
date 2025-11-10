/**
 * Risk Management Module
 * Implements position sizing, stop loss, take profit, and Van Tharp's R-multiples
 */

export interface RiskParameters {
  accountBalance: number;
  riskPercentage: number; // Percentage of account to risk per trade (e.g., 1, 2)
  entryPrice: number;
  stopLossPrice: number;
  takeProfitPrice?: number;
}

export interface PositionSize {
  quantity: number;
  riskAmount: number;
  positionValue: number;
  rMultiple: number;
}

export interface TradeMetrics {
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  pnlPercentage: number;
  rMultiple: number;
}

/**
 * Calculate position size based on risk parameters (Van Tharp method)
 * @param params - Risk parameters
 * @returns Position size details
 */
export function calculatePositionSize(params: RiskParameters): PositionSize {
  const { accountBalance, riskPercentage, entryPrice, stopLossPrice } = params;
  
  // Calculate risk amount in currency
  const riskAmount = accountBalance * (riskPercentage / 100);
  
  // Calculate risk per unit (R)
  const riskPerUnit = Math.abs(entryPrice - stopLossPrice);
  
  // Calculate position size
  const quantity = riskAmount / riskPerUnit;
  
  // Calculate position value
  const positionValue = quantity * entryPrice;
  
  // R-multiple is 1 by definition at entry (we're risking 1R)
  const rMultiple = 1;
  
  return {
    quantity,
    riskAmount,
    positionValue,
    rMultiple,
  };
}

/**
 * Calculate dynamic stop loss based on ATR
 * @param currentPrice - Current market price
 * @param atr - Average True Range value
 * @param multiplier - ATR multiplier (default: 2)
 * @param side - Trade side ('buy' or 'sell')
 * @returns Stop loss price
 */
export function calculateATRStopLoss(
  currentPrice: number,
  atr: number,
  multiplier: number = 2,
  side: 'buy' | 'sell'
): number {
  if (side === 'buy') {
    return currentPrice - (atr * multiplier);
  } else {
    return currentPrice + (atr * multiplier);
  }
}

/**
 * Calculate dynamic take profit based on risk-reward ratio
 * @param entryPrice - Entry price
 * @param stopLossPrice - Stop loss price
 * @param riskRewardRatio - Desired risk-reward ratio (e.g., 2 means 2:1)
 * @param side - Trade side ('buy' or 'sell')
 * @returns Take profit price
 */
export function calculateTakeProfit(
  entryPrice: number,
  stopLossPrice: number,
  riskRewardRatio: number,
  side: 'buy' | 'sell'
): number {
  const risk = Math.abs(entryPrice - stopLossPrice);
  const reward = risk * riskRewardRatio;
  
  if (side === 'buy') {
    return entryPrice + reward;
  } else {
    return entryPrice - reward;
  }
}

/**
 * Calculate R-multiple for a trade (Van Tharp method)
 * @param entryPrice - Entry price
 * @param exitPrice - Exit price
 * @param stopLossPrice - Initial stop loss price
 * @param side - Trade side ('buy' or 'sell')
 * @returns R-multiple value
 */
export function calculateRMultiple(
  entryPrice: number,
  exitPrice: number,
  stopLossPrice: number,
  side: 'buy' | 'sell'
): number {
  const initialRisk = Math.abs(entryPrice - stopLossPrice);
  
  let profit: number;
  if (side === 'buy') {
    profit = exitPrice - entryPrice;
  } else {
    profit = entryPrice - exitPrice;
  }
  
  return profit / initialRisk;
}

/**
 * Calculate trade metrics including P&L and R-multiple
 * @param entryPrice - Entry price
 * @param exitPrice - Exit price
 * @param quantity - Position size
 * @param stopLossPrice - Initial stop loss price
 * @param side - Trade side ('buy' or 'sell')
 * @returns Trade metrics
 */
export function calculateTradeMetrics(
  entryPrice: number,
  exitPrice: number,
  quantity: number,
  stopLossPrice: number,
  side: 'buy' | 'sell'
): TradeMetrics {
  let pnl: number;
  if (side === 'buy') {
    pnl = (exitPrice - entryPrice) * quantity;
  } else {
    pnl = (entryPrice - exitPrice) * quantity;
  }
  
  const pnlPercentage = ((exitPrice - entryPrice) / entryPrice) * 100;
  const rMultiple = calculateRMultiple(entryPrice, exitPrice, stopLossPrice, side);
  
  return {
    entryPrice,
    exitPrice,
    quantity,
    pnl,
    pnlPercentage: side === 'buy' ? pnlPercentage : -pnlPercentage,
    rMultiple,
  };
}

/**
 * Calculate expectancy (average R-multiple per trade)
 * @param trades - Array of R-multiples from past trades
 * @returns Expectancy value
 */
export function calculateExpectancy(trades: number[]): number {
  if (trades.length === 0) return 0;
  
  const sum = trades.reduce((acc, r) => acc + r, 0);
  return sum / trades.length;
}

/**
 * Calculate win rate
 * @param trades - Array of R-multiples from past trades
 * @returns Win rate percentage (0-100)
 */
export function calculateWinRate(trades: number[]): number {
  if (trades.length === 0) return 0;
  
  const winningTrades = trades.filter(r => r > 0).length;
  return (winningTrades / trades.length) * 100;
}

/**
 * Calculate maximum position size based on Kelly Criterion
 * @param winRate - Win rate (0-1)
 * @param avgWin - Average winning R-multiple
 * @param avgLoss - Average losing R-multiple (positive number)
 * @param accountBalance - Total account balance
 * @returns Recommended position size percentage
 */
export function calculateKellyCriterion(
  winRate: number,
  avgWin: number,
  avgLoss: number,
  accountBalance: number
): number {
  // Kelly % = W - [(1 - W) / R]
  // Where W = win rate, R = average win / average loss
  
  const lossRate = 1 - winRate;
  const winLossRatio = avgWin / avgLoss;
  
  const kellyPercentage = winRate - (lossRate / winLossRatio);
  
  // Use fractional Kelly (e.g., 50% of Kelly) for safety
  const fractionalKelly = kellyPercentage * 0.5;
  
  // Cap at maximum 5% of account
  return Math.min(Math.max(fractionalKelly, 0), 0.05) * 100;
}

/**
 * Check if trade should be taken based on risk-reward ratio
 * @param entryPrice - Entry price
 * @param stopLossPrice - Stop loss price
 * @param takeProfitPrice - Take profit price
 * @param minRiskReward - Minimum acceptable risk-reward ratio
 * @param side - Trade side ('buy' or 'sell')
 * @returns True if trade meets minimum risk-reward criteria
 */
export function isTradeWorthTaking(
  entryPrice: number,
  stopLossPrice: number,
  takeProfitPrice: number,
  minRiskReward: number,
  side: 'buy' | 'sell'
): boolean {
  const risk = Math.abs(entryPrice - stopLossPrice);
  const reward = Math.abs(takeProfitPrice - entryPrice);
  
  const riskRewardRatio = reward / risk;
  
  return riskRewardRatio >= minRiskReward;
}

/**
 * Calculate maximum drawdown from equity curve
 * @param equityCurve - Array of account balances over time
 * @returns Maximum drawdown percentage
 */
export function calculateMaxDrawdown(equityCurve: number[]): number {
  if (equityCurve.length === 0) return 0;
  
  let maxDrawdown = 0;
  let peak = equityCurve[0];
  
  for (const value of equityCurve) {
    if (value > peak) {
      peak = value;
    }
    
    const drawdown = ((peak - value) / peak) * 100;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }
  
  return maxDrawdown;
}

/**
 * Calculate Sharpe Ratio
 * @param returns - Array of period returns (as percentages)
 * @param riskFreeRate - Risk-free rate (annual percentage, e.g., 2 for 2%)
 * @returns Sharpe Ratio
 */
export function calculateSharpeRatio(returns: number[], riskFreeRate: number = 0): number {
  if (returns.length === 0) return 0;
  
  // Calculate average return
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  
  // Calculate standard deviation
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  
  if (stdDev === 0) return 0;
  
  // Sharpe Ratio = (Average Return - Risk Free Rate) / Standard Deviation
  return (avgReturn - riskFreeRate) / stdDev;
}

/**
 * Validate risk parameters before trade execution
 * @param params - Risk parameters
 * @returns Validation result with error message if invalid
 */
export function validateRiskParameters(params: RiskParameters): { valid: boolean; error?: string } {
  const { accountBalance, riskPercentage, entryPrice, stopLossPrice } = params;
  
  if (accountBalance <= 0) {
    return { valid: false, error: 'رصيد الحساب يجب أن يكون أكبر من صفر' };
  }
  
  if (riskPercentage <= 0 || riskPercentage > 10) {
    return { valid: false, error: 'نسبة المخاطرة يجب أن تكون بين 0.1% و 10%' };
  }
  
  if (entryPrice <= 0 || stopLossPrice <= 0) {
    return { valid: false, error: 'أسعار الدخول والإيقاف يجب أن تكون أكبر من صفر' };
  }
  
  if (entryPrice === stopLossPrice) {
    return { valid: false, error: 'سعر الدخول وسعر الإيقاف لا يمكن أن يكونا متساويين' };
  }
  
  return { valid: true };
}
