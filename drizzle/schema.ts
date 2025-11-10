import { boolean, index, integer, pgEnum, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

// Define enums for PostgreSQL
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const sideEnum = pgEnum("side", ["buy", "sell"]);
export const orderTypeEnum = pgEnum("order_type", ["market", "limit", "stop_loss", "take_profit"]);
export const marginModeEnum = pgEnum("margin_mode", ["isolated", "cross"]);
export const orderStatusEnum = pgEnum("order_status", ["pending", "filled", "partially_filled", "canceled", "failed"]);
export const signalTypeEnum = pgEnum("signal_type", ["buy", "sell", "hold"]);
export const signalStatusEnum = pgEnum("signal_status", ["pending", "executed", "cancelled", "expired"]);
export const tradeStatusEnum = pgEnum("trade_status", ["open", "closed", "cancelled"]);
export const chatRoleEnum = pgEnum("chat_role", ["user", "assistant", "system"]);

/**
 * Core user table backing auth flow.
 * Extended with trading-specific role management.
 */
export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Trade execution history table
 * Stores all executed trades with full details
 */
export const tradeExecutions = pgTable("trade_executions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("userId").notNull(),
  orderId: varchar("orderId", { length: 255 }),
  symbol: varchar("symbol", { length: 50 }).notNull(),
  side: sideEnum("side").notNull(),
  type: orderTypeEnum("type").notNull(),
  amount: varchar("amount", { length: 50 }).notNull(),
  price: varchar("price", { length: 50 }),
  stopLoss: varchar("stopLoss", { length: 50 }),
  takeProfit: varchar("takeProfit", { length: 50 }),
  leverage: integer("leverage"),
  marginMode: marginModeEnum("marginMode"),
  status: orderStatusEnum("status").notNull(),
  filledAmount: varchar("filledAmount", { length: 50 }),
  averagePrice: varchar("averagePrice", { length: 50 }),
  fee: varchar("fee", { length: 50 }),
  pnl: varchar("pnl", { length: 50 }),
  pnlPercent: varchar("pnlPercent", { length: 50 }),
  strategyUsed: text("strategyUsed"),
  aiRecommendation: text("aiRecommendation"),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  closedAt: timestamp("closedAt"),
});

export type TradeExecution = typeof tradeExecutions.$inferSelect;
export type InsertTradeExecution = typeof tradeExecutions.$inferInsert;

/**
 * API Keys table for exchange connections (OKX, Binance, etc.)
 * Keys are encrypted at rest for security
 */
export const apiKeys = pgTable("api_keys", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("userId").notNull(),
  exchange: varchar("exchange", { length: 32 }).notNull(), // 'okx', 'binance', etc.
  apiKey: text("apiKey").notNull(), // Encrypted
  secretKey: text("secretKey").notNull(), // Encrypted
  passphrase: text("passphrase"), // Encrypted, optional for some exchanges
  isActive: boolean("isActive").default(true).notNull(),
  lastUsed: timestamp("lastUsed"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("api_keys_userId_idx").on(table.userId),
}));

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;

/**
 * Market data (OHLCV) for various trading pairs
 * Stores historical and real-time candlestick data
 */
export const marketData = pgTable("market_data", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  exchange: varchar("exchange", { length: 32 }).notNull(),
  symbol: varchar("symbol", { length: 32 }).notNull(), // 'BTC/USDT', 'ETH/USDT', etc.
  timeframe: varchar("timeframe", { length: 16 }).notNull(), // '1m', '5m', '15m', '1h', '4h', '1d'
  timestamp: timestamp("timestamp").notNull(),
  open: varchar("open", { length: 32 }).notNull(), // Using varchar to avoid decimal precision issues
  high: varchar("high", { length: 32 }).notNull(),
  low: varchar("low", { length: 32 }).notNull(),
  close: varchar("close", { length: 32 }).notNull(),
  volume: varchar("volume", { length: 32 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  symbolTimeframeIdx: index("market_data_symbol_timeframe_idx").on(table.symbol, table.timeframe, table.timestamp),
}));

export type MarketData = typeof marketData.$inferSelect;
export type InsertMarketData = typeof marketData.$inferInsert;

/**
 * Trading signals generated by strategies or AI
 */
export const tradingSignals = pgTable("trading_signals", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("userId").notNull(),
  symbol: varchar("symbol", { length: 32 }).notNull(),
  exchange: varchar("exchange", { length: 32 }).notNull(),
  signalType: signalTypeEnum("signalType").notNull(),
  strategy: varchar("strategy", { length: 64 }).notNull(), // 'ma_crossover', 'rsi_divergence', 'ai_sentiment', etc.
  confidence: integer("confidence").notNull(), // 0-100
  entryPrice: varchar("entryPrice", { length: 32 }),
  stopLoss: varchar("stopLoss", { length: 32 }),
  takeProfit: varchar("takeProfit", { length: 32 }),
  reasoning: text("reasoning"), // AI-generated explanation
  status: signalStatusEnum("status").default("pending").notNull(),
  executedAt: timestamp("executedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("trading_signals_userId_idx").on(table.userId),
  symbolIdx: index("trading_signals_symbol_idx").on(table.symbol),
}));

export type TradingSignal = typeof tradingSignals.$inferSelect;
export type InsertTradingSignal = typeof tradingSignals.$inferInsert;

/**
 * Trade execution history
 */
export const trades = pgTable("trades", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("userId").notNull(),
  signalId: integer("signalId"), // Reference to the signal that triggered this trade
  exchange: varchar("exchange", { length: 32 }).notNull(),
  symbol: varchar("symbol", { length: 32 }).notNull(),
  side: sideEnum("side").notNull(),
  entryPrice: varchar("entryPrice", { length: 32 }).notNull(),
  exitPrice: varchar("exitPrice", { length: 32 }),
  quantity: varchar("quantity", { length: 32 }).notNull(),
  pnl: varchar("pnl", { length: 32 }), // Profit/Loss in quote currency
  pnlPercentage: varchar("pnlPercentage", { length: 16 }), // Profit/Loss percentage
  fees: varchar("fees", { length: 32 }),
  status: tradeStatusEnum("status").default("open").notNull(),
  openedAt: timestamp("openedAt").defaultNow().notNull(),
  closedAt: timestamp("closedAt"),
  notes: text("notes"),
}, (table) => ({
  userIdIdx: index("trades_userId_idx").on(table.userId),
  symbolIdx: index("trades_symbol_idx").on(table.symbol),
}));

export type Trade = typeof trades.$inferSelect;
export type InsertTrade = typeof trades.$inferInsert;

/**
 * Backtesting results for strategy evaluation
 */
export const backtestResults = pgTable("backtest_results", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("userId").notNull(),
  strategyName: varchar("strategyName", { length: 64 }).notNull(),
  symbol: varchar("symbol", { length: 32 }).notNull(),
  timeframe: varchar("timeframe", { length: 16 }).notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  initialCapital: varchar("initialCapital", { length: 32 }).notNull(),
  finalCapital: varchar("finalCapital", { length: 32 }).notNull(),
  totalReturn: varchar("totalReturn", { length: 16 }).notNull(), // Percentage
  sharpeRatio: varchar("sharpeRatio", { length: 16 }),
  maxDrawdown: varchar("maxDrawdown", { length: 16 }),
  winRate: varchar("winRate", { length: 16 }),
  totalTrades: integer("totalTrades").notNull(),
  winningTrades: integer("winningTrades").notNull(),
  losingTrades: integer("losingTrades").notNull(),
  avgWin: varchar("avgWin", { length: 32 }),
  avgLoss: varchar("avgLoss", { length: 32 }),
  profitFactor: varchar("profitFactor", { length: 16 }),
  parameters: text("parameters"), // JSON string of strategy parameters
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("backtest_results_userId_idx").on(table.userId),
  strategyIdx: index("backtest_results_strategy_idx").on(table.strategyName),
}));

export type BacktestResult = typeof backtestResults.$inferSelect;
export type InsertBacktestResult = typeof backtestResults.$inferInsert;

/**
 * Chat history for AI conversations
 */
export const chatMessages = pgTable("chat_messages", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("userId").notNull(),
  role: chatRoleEnum("role").notNull(),
  content: text("content").notNull(),
  metadata: text("metadata"), // JSON string for additional context (e.g., attached charts, signals)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("chat_messages_userId_idx").on(table.userId),
}));

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

/**
 * Technical indicators cache for performance optimization
 */
export const indicatorCache = pgTable("indicator_cache", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  symbol: varchar("symbol", { length: 32 }).notNull(),
  timeframe: varchar("timeframe", { length: 16 }).notNull(),
  indicatorName: varchar("indicatorName", { length: 64 }).notNull(), // 'rsi', 'macd', 'bollinger_bands', etc.
  timestamp: timestamp("timestamp").notNull(),
  value: text("value").notNull(), // JSON string of indicator values
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  symbolTimeframeIndicatorIdx: index("indicator_cache_symbol_timeframe_indicator_idx").on(table.symbol, table.timeframe, table.indicatorName, table.timestamp),
}));

export type IndicatorCache = typeof indicatorCache.$inferSelect;
export type InsertIndicatorCache = typeof indicatorCache.$inferInsert;
