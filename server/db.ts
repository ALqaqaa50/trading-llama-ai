import { eq, and, desc, asc, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  apiKeys, 
  InsertApiKey, 
  ApiKey,
  marketData,
  InsertMarketData,
  MarketData,
  tradingSignals,
  InsertTradingSignal,
  TradingSignal,
  trades,
  InsertTrade,
  Trade,
  backtestResults,
  InsertBacktestResult,
  BacktestResult,
  chatMessages,
  InsertChatMessage,
  ChatMessage,
  indicatorCache,
  InsertIndicatorCache,
  IndicatorCache
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ==================== User Management ====================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ==================== API Key Management ====================

export async function saveApiKey(apiKey: InsertApiKey): Promise<ApiKey> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(apiKeys).values(apiKey);
  const insertedId = Number(result[0].insertId);
  
  const inserted = await db.select().from(apiKeys).where(eq(apiKeys.id, insertedId)).limit(1);
  return inserted[0];
}

export async function getApiKeysByUserId(userId: number): Promise<ApiKey[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(apiKeys).where(eq(apiKeys.userId, userId));
}

export async function getActiveApiKey(userId: number, exchange: string): Promise<ApiKey | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(apiKeys)
    .where(and(
      eq(apiKeys.userId, userId),
      eq(apiKeys.exchange, exchange),
      eq(apiKeys.isActive, true)
    ))
    .limit(1);

  return result[0];
}

export async function updateApiKeyLastUsed(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(apiKeys)
    .set({ lastUsed: new Date() })
    .where(eq(apiKeys.id, id));
}

export async function deactivateApiKey(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(apiKeys)
    .set({ isActive: false })
    .where(eq(apiKeys.id, id));
}

// ==================== Market Data ====================

export async function saveMarketData(data: InsertMarketData[]): Promise<void> {
  const db = await getDb();
  if (!db || data.length === 0) return;

  await db.insert(marketData).values(data);
}

export async function getMarketData(
  symbol: string,
  timeframe: string,
  startTime?: Date,
  endTime?: Date,
  limit: number = 1000
): Promise<MarketData[]> {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(marketData)
    .where(and(
      eq(marketData.symbol, symbol),
      eq(marketData.timeframe, timeframe),
      startTime ? gte(marketData.timestamp, startTime) : undefined,
      endTime ? lte(marketData.timestamp, endTime) : undefined
    ))
    .orderBy(asc(marketData.timestamp))
    .limit(limit);

  return await query;
}

export async function getLatestMarketData(symbol: string, timeframe: string): Promise<MarketData | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(marketData)
    .where(and(
      eq(marketData.symbol, symbol),
      eq(marketData.timeframe, timeframe)
    ))
    .orderBy(desc(marketData.timestamp))
    .limit(1);

  return result[0];
}

// ==================== Trading Signals ====================

export async function saveTradingSignal(signal: InsertTradingSignal): Promise<TradingSignal> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(tradingSignals).values(signal);
  const insertedId = Number(result[0].insertId);
  
  const inserted = await db.select().from(tradingSignals).where(eq(tradingSignals.id, insertedId)).limit(1);
  return inserted[0];
}

export async function getUserSignals(userId: number, limit: number = 50): Promise<TradingSignal[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(tradingSignals)
    .where(eq(tradingSignals.userId, userId))
    .orderBy(desc(tradingSignals.createdAt))
    .limit(limit);
}

export async function updateSignalStatus(id: number, status: "pending" | "executed" | "cancelled" | "expired"): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(tradingSignals)
    .set({ 
      status,
      executedAt: status === "executed" ? new Date() : undefined
    })
    .where(eq(tradingSignals.id, id));
}

// ==================== Trades ====================

export async function saveTrade(trade: InsertTrade): Promise<Trade> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(trades).values(trade);
  const insertedId = Number(result[0].insertId);
  
  const inserted = await db.select().from(trades).where(eq(trades.id, insertedId)).limit(1);
  return inserted[0];
}

export async function getUserTrades(userId: number, limit: number = 100): Promise<Trade[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(trades)
    .where(eq(trades.userId, userId))
    .orderBy(desc(trades.openedAt))
    .limit(limit);
}

export async function closeTrade(id: number, exitPrice: string, pnl: string, pnlPercentage: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(trades)
    .set({ 
      status: "closed",
      exitPrice,
      pnl,
      pnlPercentage,
      closedAt: new Date()
    })
    .where(eq(trades.id, id));
}

// ==================== Backtest Results ====================

export async function saveBacktestResult(result: InsertBacktestResult): Promise<BacktestResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const insertResult = await db.insert(backtestResults).values(result);
  const insertedId = Number(insertResult[0].insertId);
  
  const inserted = await db.select().from(backtestResults).where(eq(backtestResults.id, insertedId)).limit(1);
  return inserted[0];
}

export async function getUserBacktestResults(userId: number, limit: number = 50): Promise<BacktestResult[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(backtestResults)
    .where(eq(backtestResults.userId, userId))
    .orderBy(desc(backtestResults.createdAt))
    .limit(limit);
}

// ==================== Chat Messages ====================

export async function saveChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(chatMessages).values(message);
  const insertedId = Number(result[0].insertId);
  
  const inserted = await db.select().from(chatMessages).where(eq(chatMessages.id, insertedId)).limit(1);
  return inserted[0];
}

export async function getUserChatHistory(userId: number, limit: number = 100): Promise<ChatMessage[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(chatMessages)
    .where(eq(chatMessages.userId, userId))
    .orderBy(asc(chatMessages.createdAt))
    .limit(limit);
}

// ==================== Indicator Cache ====================

export async function saveIndicatorCache(cache: InsertIndicatorCache): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(indicatorCache).values(cache);
}

export async function getIndicatorCache(
  symbol: string,
  timeframe: string,
  indicatorName: string,
  timestamp: Date
): Promise<IndicatorCache | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(indicatorCache)
    .where(and(
      eq(indicatorCache.symbol, symbol),
      eq(indicatorCache.timeframe, timeframe),
      eq(indicatorCache.indicatorName, indicatorName),
      eq(indicatorCache.timestamp, timestamp)
    ))
    .limit(1);

  return result[0];
}
