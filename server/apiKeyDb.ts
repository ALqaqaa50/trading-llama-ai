import { eq, and } from "drizzle-orm";
import { apiKeys, type ApiKey, type InsertApiKey } from "../drizzle/schema";
import { getDb } from "./db";
import { encrypt, decrypt } from "./encryption";

/**
 * Database functions for API key management
 */

export interface ApiKeyInput {
  userId: number;
  exchange: string;
  apiKey: string;
  secretKey: string;
  passphrase?: string;
}

export interface DecryptedApiKey extends Omit<ApiKey, 'apiKey' | 'secretKey' | 'passphrase'> {
  apiKey: string;
  secretKey: string;
  passphrase: string | null;
}

/**
 * Save encrypted API keys for a user
 */
export async function saveApiKeys(input: ApiKeyInput): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Encrypt sensitive data
  const encryptedApiKey = encrypt(input.apiKey);
  const encryptedSecretKey = encrypt(input.secretKey);
  const encryptedPassphrase = input.passphrase ? encrypt(input.passphrase) : null;

  // Check if keys already exist for this user and exchange
  const existing = await db
    .select()
    .from(apiKeys)
    .where(
      and(
        eq(apiKeys.userId, input.userId),
        eq(apiKeys.exchange, input.exchange)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // Update existing keys
    await db
      .update(apiKeys)
      .set({
        apiKey: encryptedApiKey,
        secretKey: encryptedSecretKey,
        passphrase: encryptedPassphrase,
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(apiKeys.id, existing[0].id));
  } else {
    // Insert new keys
    await db.insert(apiKeys).values({
      userId: input.userId,
      exchange: input.exchange,
      apiKey: encryptedApiKey,
      secretKey: encryptedSecretKey,
      passphrase: encryptedPassphrase,
      isActive: true,
    });
  }
}

/**
 * Get decrypted API keys for a user and exchange
 */
export async function getApiKeys(userId: number, exchange: string): Promise<DecryptedApiKey | null> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .select()
    .from(apiKeys)
    .where(
      and(
        eq(apiKeys.userId, userId),
        eq(apiKeys.exchange, exchange),
        eq(apiKeys.isActive, true)
      )
    )
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  const keys = result[0];

  // Decrypt sensitive data
  return {
    ...keys,
    apiKey: decrypt(keys.apiKey),
    secretKey: decrypt(keys.secretKey),
    passphrase: keys.passphrase ? decrypt(keys.passphrase) : null,
  };
}

/**
 * Check if user has active API keys for an exchange
 */
export async function hasApiKeys(userId: number, exchange: string): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    return false;
  }

  const result = await db
    .select()
    .from(apiKeys)
    .where(
      and(
        eq(apiKeys.userId, userId),
        eq(apiKeys.exchange, exchange),
        eq(apiKeys.isActive, true)
      )
    )
    .limit(1);

  return result.length > 0;
}

/**
 * Deactivate API keys for a user and exchange
 */
export async function deactivateApiKeys(userId: number, exchange: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .update(apiKeys)
    .set({
      isActive: false,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(apiKeys.userId, userId),
        eq(apiKeys.exchange, exchange)
      )
    );
}

/**
 * Update last used timestamp
 */
export async function updateLastUsed(userId: number, exchange: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    return;
  }

  await db
    .update(apiKeys)
    .set({
      lastUsed: new Date(),
    })
    .where(
      and(
        eq(apiKeys.userId, userId),
        eq(apiKeys.exchange, exchange)
      )
    );
}
