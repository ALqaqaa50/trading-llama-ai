import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, decimal, index } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extended with trading-specific role management.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * User trading settings and risk management preferences
 */
export const userSettings = mysqlTable("user_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  riskPercentage: varchar("riskPercentage", { length: 10 }).default("2").notNull(), // % of capital per trade
  maxDailyLoss: varchar("maxDailyLoss", { length: 50 }), // Max daily loss in USD
  maxOpenTrades: int("maxOpenTrades").default(3).notNull(),
  defaultLeverage: int("defaultLeverage").default(1).notNull(),
  autoCloseEnabled: int("autoCloseEnabled").default(1).notNull(), // 1 = enabled, 0 = disabled
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = typeof userSettings.$inferInsert;

/**
 * Telegram notification settings
 * Stores Telegram bot configuration for each user
 */
export const telegramSettings = mysqlTable("telegram_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  chatId: varchar("chatId", { length: 255 }), // Telegram Chat ID
  enabled: int("enabled").default(1).notNull(), // 1 = enabled, 0 = disabled
  notifyOnTradeOpen: int("notifyOnTradeOpen").default(1).notNull(),
  notifyOnTradeClose: int("notifyOnTradeClose").default(1).notNull(),
  notifyOnStopLoss: int("notifyOnStopLoss").default(1).notNull(),
  notifyOnTakeProfit: int("notifyOnTakeProfit").default(1).notNull(),
  notifyOnDailyLossLimit: int("notifyOnDailyLossLimit").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TelegramSettings = typeof telegramSettings.$inferSelect;
export type InsertTelegramSettings = typeof telegramSettings.$inferInsert;

/**
 * Trade execution history table
 * Stores all executed trades with full details
 */
export const tradeExecutions = mysqlTable("trade_executions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  orderId: varchar("orderId", { length: 255 }),
  symbol: varchar("symbol", { length: 50 }).notNull(),
  side: mysqlEnum("side", ["buy", "sell"]).notNull(),
  type: mysqlEnum("type", ["market", "limit", "stop_loss", "take_profit"]).notNull(),
  amount: varchar("amount", { length: 50 }).notNull(),
  price: varchar("price", { length: 50 }),
  stopLoss: varchar("stopLoss", { length: 50 }),
  takeProfit: varchar("takeProfit", { length: 50 }),
  leverage: int("leverage"),
  marginMode: mysqlEnum("marginMode", ["isolated", "cross"]),
  status: mysqlEnum("status", ["pending", "filled", "partially_filled", "canceled", "failed"]).notNull(),
  filledAmount: varchar("filledAmount", { length: 50 }),
  averagePrice: varchar("averagePrice", { length: 50 }),
  fee: varchar("fee", { length: 50 }),
  pnl: varchar("pnl", { length: 50 }),
  pnlPercent: varchar("pnlPercent", { length: 50 }),
  strategyUsed: text("strategyUsed"),
  aiRecommendation: text("aiRecommendation"),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  closedAt: timestamp("closedAt"),
});

export type TradeExecution = typeof tradeExecutions.$inferSelect;
export type InsertTradeExecution = typeof tradeExecutions.$inferInsert;

/**
 * API Keys table for exchange connections (OKX, Binance, etc.)
 * Keys are encrypted at rest for security
 */
export const apiKeys = mysqlTable("api_keys", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  exchange: varchar("exchange", { length: 32 }).notNull(), // 'okx', 'binance', etc.
  apiKey: text("apiKey").notNull(), // Encrypted
  secretKey: text("secretKey").notNull(), // Encrypted
  passphrase: text("passphrase"), // Encrypted, optional for some exchanges
  isActive: boolean("isActive").default(true).notNull(),
  lastUsed: timestamp("lastUsed"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("userId_idx").on(table.userId),
}));

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;

/**
 * Market data (OHLCV) for various trading pairs
 * Stores historical and real-time candlestick data
 */
export const marketData = mysqlTable("market_data", {
  id: int("id").autoincrement().primaryKey(),
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
  symbolTimeframeIdx: index("symbol_timeframe_idx").on(table.symbol, table.timeframe, table.timestamp),
}));

export type MarketData = typeof marketData.$inferSelect;
export type InsertMarketData = typeof marketData.$inferInsert;

/**
 * Trading signals generated by strategies or AI
 */
export const tradingSignals = mysqlTable("trading_signals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  symbol: varchar("symbol", { length: 32 }).notNull(),
  exchange: varchar("exchange", { length: 32 }).notNull(),
  signalType: mysqlEnum("signalType", ["buy", "sell", "hold"]).notNull(),
  strategy: varchar("strategy", { length: 64 }).notNull(), // 'ma_crossover', 'rsi_divergence', 'ai_sentiment', etc.
  confidence: int("confidence").notNull(), // 0-100
  entryPrice: varchar("entryPrice", { length: 32 }),
  stopLoss: varchar("stopLoss", { length: 32 }),
  takeProfit: varchar("takeProfit", { length: 32 }),
  reasoning: text("reasoning"), // AI-generated explanation
  status: mysqlEnum("status", ["pending", "executed", "cancelled", "expired"]).default("pending").notNull(),
  executedAt: timestamp("executedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("userId_idx").on(table.userId),
  symbolIdx: index("symbol_idx").on(table.symbol),
}));

export type TradingSignal = typeof tradingSignals.$inferSelect;
export type InsertTradingSignal = typeof tradingSignals.$inferInsert;

/**
 * Trade execution history
 */
export const trades = mysqlTable("trades", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  signalId: int("signalId"), // Reference to the signal that triggered this trade
  exchange: varchar("exchange", { length: 32 }).notNull(),
  symbol: varchar("symbol", { length: 32 }).notNull(),
  side: mysqlEnum("side", ["buy", "sell"]).notNull(),
  entryPrice: varchar("entryPrice", { length: 32 }).notNull(),
  exitPrice: varchar("exitPrice", { length: 32 }),
  quantity: varchar("quantity", { length: 32 }).notNull(),
  pnl: varchar("pnl", { length: 32 }), // Profit/Loss in quote currency
  pnlPercentage: varchar("pnlPercentage", { length: 16 }), // Profit/Loss percentage
  fees: varchar("fees", { length: 32 }),
  status: mysqlEnum("status", ["open", "closed", "cancelled"]).default("open").notNull(),
  openedAt: timestamp("openedAt").defaultNow().notNull(),
  closedAt: timestamp("closedAt"),
  notes: text("notes"),
}, (table) => ({
  userIdIdx: index("userId_idx").on(table.userId),
  symbolIdx: index("symbol_idx").on(table.symbol),
}));

export type Trade = typeof trades.$inferSelect;
export type InsertTrade = typeof trades.$inferInsert;

/**
 * Backtesting results for strategy evaluation
 */
export const backtestResults = mysqlTable("backtest_results", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
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
  totalTrades: int("totalTrades").notNull(),
  winningTrades: int("winningTrades").notNull(),
  losingTrades: int("losingTrades").notNull(),
  avgWin: varchar("avgWin", { length: 32 }),
  avgLoss: varchar("avgLoss", { length: 32 }),
  profitFactor: varchar("profitFactor", { length: 16 }),
  parameters: text("parameters"), // JSON string of strategy parameters
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("userId_idx").on(table.userId),
  strategyIdx: index("strategy_idx").on(table.strategyName),
}));

export type BacktestResult = typeof backtestResults.$inferSelect;
export type InsertBacktestResult = typeof backtestResults.$inferInsert;

/**
 * Chat history for AI conversations
 */
export const chatMessages = mysqlTable("chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  metadata: text("metadata"), // JSON string for additional context (e.g., attached charts, signals)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("userId_idx").on(table.userId),
}));

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

/**
 * Technical indicators cache for performance optimization
 */
export const indicatorCache = mysqlTable("indicator_cache", {
  id: int("id").autoincrement().primaryKey(),
  symbol: varchar("symbol", { length: 32 }).notNull(),
  timeframe: varchar("timeframe", { length: 16 }).notNull(),
  indicatorName: varchar("indicatorName", { length: 64 }).notNull(), // 'rsi', 'macd', 'bollinger_bands', etc.
  timestamp: timestamp("timestamp").notNull(),
  value: text("value").notNull(), // JSON string of indicator values
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  symbolTimeframeIndicatorIdx: index("symbol_timeframe_indicator_idx").on(table.symbol, table.timeframe, table.indicatorName, table.timestamp),
}));

export type IndicatorCache = typeof indicatorCache.$inferSelect;
export type InsertIndicatorCache = typeof indicatorCache.$inferInsert;
