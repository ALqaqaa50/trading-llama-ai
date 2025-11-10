import { eq, desc, and } from "drizzle-orm";
import { getDb } from "./db";
import { tradeExecutions, InsertTradeExecution } from "../drizzle/schema";

/**
 * Database functions for trade execution tracking
 */

/**
 * Save a trade execution to database
 */
export async function saveTradeExecution(trade: InsertTradeExecution) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot save trade execution: database not available");
    return null;
  }

  try {
    const result = await db.insert(tradeExecutions).values(trade).returning();
    return result[0];
  } catch (error) {
    console.error("[Database] Failed to save trade execution:", error);
    throw error;
  }
}

/**
 * Update trade execution status
 */
export async function updateTradeExecution(
  id: number,
  updates: Partial<InsertTradeExecution>
) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update trade execution: database not available");
    return null;
  }

  try {
    await db.update(tradeExecutions).set(updates).where(eq(tradeExecutions.id, id));
    return true;
  } catch (error) {
    console.error("[Database] Failed to update trade execution:", error);
    throw error;
  }
}

/**
 * Get all trade executions for a user
 */
export async function getTradeExecutionsByUserId(userId: number, limit: number = 100) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get trade executions: database not available");
    return [];
  }

  try {
    const trades = await db
      .select()
      .from(tradeExecutions)
      .where(eq(tradeExecutions.userId, userId))
      .orderBy(desc(tradeExecutions.createdAt))
      .limit(limit);
    return trades;
  } catch (error) {
    console.error("[Database] Failed to get trade executions:", error);
    return [];
  }
}

/**
 * Get open trades (not closed yet)
 */
export async function getOpenTrades(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get open trades: database not available");
    return [];
  }

  try {
    const trades = await db
      .select()
      .from(tradeExecutions)
      .where(
        and(
          eq(tradeExecutions.userId, userId),
          eq(tradeExecutions.status, "filled")
        )
      )
      .orderBy(desc(tradeExecutions.createdAt));
    
    // Filter trades that don't have a closedAt timestamp
    return trades.filter(trade => !trade.closedAt);
  } catch (error) {
    console.error("[Database] Failed to get open trades:", error);
    return [];
  }
}

/**
 * Get trade execution by ID
 */
export async function getTradeExecutionById(id: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get trade execution: database not available");
    return null;
  }

  try {
    const [trade] = await db
      .select()
      .from(tradeExecutions)
      .where(eq(tradeExecutions.id, id))
      .limit(1);
    return trade || null;
  } catch (error) {
    console.error("[Database] Failed to get trade execution:", error);
    return null;
  }
}

/**
 * Get trade execution by order ID
 */
export async function getTradeExecutionByOrderId(userId: number, orderId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get trade execution: database not available");
    return null;
  }

  try {
    const [trade] = await db
      .select()
      .from(tradeExecutions)
      .where(
        and(
          eq(tradeExecutions.userId, userId),
          eq(tradeExecutions.orderId, orderId)
        )
      )
      .limit(1);
    return trade || null;
  } catch (error) {
    console.error("[Database] Failed to get trade execution:", error);
    return null;
  }
}

/**
 * Calculate total P&L for a user
 */
export async function calculateTotalPnL(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot calculate P&L: database not available");
    return { totalPnl: 0, totalTrades: 0, winRate: 0 };
  }

  try {
    const trades = await db
      .select()
      .from(tradeExecutions)
      .where(
        and(
          eq(tradeExecutions.userId, userId),
          eq(tradeExecutions.status, "filled")
        )
      );

    const closedTrades = trades.filter(trade => trade.closedAt && trade.pnl);
    
    const totalPnl = closedTrades.reduce((sum, trade) => {
      return sum + parseFloat(trade.pnl || '0');
    }, 0);

    const winningTrades = closedTrades.filter(trade => parseFloat(trade.pnl || '0') > 0);
    const winRate = closedTrades.length > 0 
      ? (winningTrades.length / closedTrades.length) * 100 
      : 0;

    return {
      totalPnl,
      totalTrades: closedTrades.length,
      winRate: parseFloat(winRate.toFixed(2)),
      winningTrades: winningTrades.length,
      losingTrades: closedTrades.length - winningTrades.length,
    };
  } catch (error) {
    console.error("[Database] Failed to calculate P&L:", error);
    return { totalPnl: 0, totalTrades: 0, winRate: 0, winningTrades: 0, losingTrades: 0 };
  }
}
