import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { userSettings, InsertUserSettings } from "../drizzle/schema";

/**
 * Database functions for user settings management
 */

/**
 * Get user settings by user ID
 */
export async function getUserSettings(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user settings: database not available");
    return null;
  }

  try {
    const [settings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);

    return settings || null;
  } catch (error) {
    console.error("[Database] Failed to get user settings:", error);
    return null;
  }
}

/**
 * Create or update user settings
 */
export async function upsertUserSettings(settings: InsertUserSettings) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user settings: database not available");
    return null;
  }

  try {
    const existing = await getUserSettings(settings.userId);

    if (existing) {
      // Update existing settings
      await db
        .update(userSettings)
        .set(settings)
        .where(eq(userSettings.userId, settings.userId));
      const updated = await getUserSettings(settings.userId);
      return updated;
    } else {
      // Insert new settings
      await db.insert(userSettings).values(settings);
      const created = await getUserSettings(settings.userId);
      return created;
    }
  } catch (error) {
    console.error("[Database] Failed to upsert user settings:", error);
    throw error;
  }
}

/**
 * Get or create default user settings
 */
export async function getOrCreateUserSettings(userId: number) {
  let settings = await getUserSettings(userId);

  if (!settings) {
    // Create default settings
    settings = await upsertUserSettings({
      userId,
      riskPercentage: "2", // 2% risk per trade
      maxDailyLoss: "100", // $100 max daily loss
      maxOpenTrades: 3,
      defaultLeverage: 1,
      autoCloseEnabled: 1,
    });
  }

  return settings;
}

/**
 * Calculate position size based on risk percentage
 */
export async function calculatePositionSize(
  userId: number,
  accountBalance: number,
  entryPrice: number,
  stopLoss: number
): Promise<number> {
  const settings = await getOrCreateUserSettings(userId);
  
  if (!settings) {
    // Fallback to default 2% risk
    const riskAmount = accountBalance * 0.02;
    const riskPerUnit = Math.abs(entryPrice - stopLoss);
    return riskAmount / riskPerUnit;
  }

  const riskPercentage = parseFloat(settings.riskPercentage) / 100;
  const riskAmount = accountBalance * riskPercentage;
  const riskPerUnit = Math.abs(entryPrice - stopLoss);
  
  if (riskPerUnit === 0) {
    // If no stop loss, use fixed percentage of balance
    return (accountBalance * riskPercentage) / entryPrice;
  }

  return riskAmount / riskPerUnit;
}

/**
 * Check if daily loss limit is exceeded
 */
export async function isDailyLossLimitExceeded(userId: number, currentDailyLoss: number): Promise<boolean> {
  const settings = await getUserSettings(userId);
  
  if (!settings || !settings.maxDailyLoss) {
    return false; // No limit set
  }

  const maxLoss = parseFloat(settings.maxDailyLoss);
  return Math.abs(currentDailyLoss) >= maxLoss;
}
