import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  saveApiKey,
  getApiKeysByUserId,
  getActiveApiKey,
  updateApiKeyLastUsed,
  saveMarketData,
  getMarketData,
  getLatestMarketData,
  saveChatMessage,
  getUserChatHistory,
  deactivateApiKey
} from "./db";
import { encryptApiKeys } from "./utils/encryption";
import { 
  testOKXConnection, 
  fetchOHLCV, 
  fetchTicker, 
  fetchBalance,
  fetchMarkets 
} from "./services/okxService";
import { generateTradingInsight, answerTradingQuestion, MarketContext } from "./services/aiTradingAssistant";
import { calculateRSI, calculateMACD, detectTrend } from "./analysis/indicators";
import { analyzePatterns } from "./analysis/candlestickPatterns";

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // API Key Management
  apiKeys: router({
    // Save new API key
    save: protectedProcedure
      .input(z.object({
        exchange: z.string(),
        apiKey: z.string(),
        secretKey: z.string(),
        passphrase: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const encrypted = encryptApiKeys(input.apiKey, input.secretKey, input.passphrase);
        
        const apiKey = await saveApiKey({
          userId: ctx.user.id,
          exchange: input.exchange.toLowerCase(),
          apiKey: encrypted.apiKey,
          secretKey: encrypted.secretKey,
          passphrase: encrypted.passphrase,
          isActive: true,
        });

        return { success: true, id: apiKey.id };
      }),

    // Get all API keys for current user
    list: protectedProcedure.query(async ({ ctx }) => {
      const keys = await getApiKeysByUserId(ctx.user.id);
      // Return without decrypted values for security
      return keys.map(key => ({
        id: key.id,
        exchange: key.exchange,
        isActive: key.isActive,
        lastUsed: key.lastUsed,
        createdAt: key.createdAt,
      }));
    }),

    // Test connection with API key
    testConnection: protectedProcedure
      .input(z.object({
        exchange: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const apiKey = await getActiveApiKey(ctx.user.id, input.exchange.toLowerCase());
        
        if (!apiKey) {
          return { success: false, message: 'No active API key found for this exchange' };
        }

        const isConnected = await testOKXConnection(apiKey);
        
        if (isConnected) {
          await updateApiKeyLastUsed(apiKey.id);
        }

        return { success: isConnected, message: isConnected ? 'Connection successful' : 'Connection failed' };
      }),

    // Deactivate an API key
    deactivate: protectedProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ input }) => {
        await deactivateApiKey(input.id);
        return { success: true };
      }),
  }),

  // Market Data
  market: router({
    // Fetch OHLCV data from OKX
    fetchOHLCV: protectedProcedure
      .input(z.object({
        symbol: z.string(),
        timeframe: z.string().default('1h'),
        limit: z.number().max(300).optional(),
      }))
      .query(async ({ ctx, input }) => {
        const apiKey = await getActiveApiKey(ctx.user.id, 'okx');
        
        if (!apiKey) {
          throw new Error('No active OKX API key found');
        }

        const data = await fetchOHLCV(apiKey, input.symbol, input.timeframe, undefined, input.limit || 100);
        
        // Save to database for caching
        const marketDataRecords = data.map(candle => ({
          exchange: 'okx',
          symbol: input.symbol,
          timeframe: input.timeframe,
          timestamp: new Date(candle.timestamp),
          open: candle.open.toString(),
          high: candle.high.toString(),
          low: candle.low.toString(),
          close: candle.close.toString(),
          volume: candle.volume.toString(),
        }));

        await saveMarketData(marketDataRecords);
        await updateApiKeyLastUsed(apiKey.id);

        return data;
      }),

    // Get historical data from database
    getHistorical: protectedProcedure
      .input(z.object({
        symbol: z.string(),
        timeframe: z.string(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        limit: z.number().default(1000),
      }))
      .query(async ({ input }) => {
        return await getMarketData(
          input.symbol,
          input.timeframe,
          input.startDate,
          input.endDate,
          input.limit
        );
      }),

    // Get latest candle
    getLatest: protectedProcedure
      .input(z.object({
        symbol: z.string(),
        timeframe: z.string(),
      }))
      .query(async ({ input }) => {
        return await getLatestMarketData(input.symbol, input.timeframe);
      }),

    // Fetch current ticker
    getTicker: protectedProcedure
      .input(z.object({
        symbol: z.string(),
      }))
      .query(async ({ ctx, input }) => {
        const apiKey = await getActiveApiKey(ctx.user.id, 'okx');
        
        if (!apiKey) {
          throw new Error('No active OKX API key found');
        }

        const ticker = await fetchTicker(apiKey, input.symbol);
        await updateApiKeyLastUsed(apiKey.id);

        return ticker;
      }),

    // Fetch account balance
    getBalance: protectedProcedure.query(async ({ ctx }) => {
      const apiKey = await getActiveApiKey(ctx.user.id, 'okx');
      
      if (!apiKey) {
        throw new Error('No active OKX API key found');
      }

      const balance = await fetchBalance(apiKey);
      await updateApiKeyLastUsed(apiKey.id);

      return balance;
    }),

    // Fetch available markets
    getMarkets: protectedProcedure.query(async ({ ctx }) => {
      const apiKey = await getActiveApiKey(ctx.user.id, 'okx');
      
      if (!apiKey) {
        throw new Error('No active OKX API key found');
      }

      const markets = await fetchMarkets(apiKey);
      await updateApiKeyLastUsed(apiKey.id);

      return markets;
    }),
  }),

  // AI Trading Assistant
  ai: router({
    // Analyze market and get trading insight
    analyzeMarket: protectedProcedure
      .input(z.object({
        symbol: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const apiKey = await getActiveApiKey(ctx.user.id, 'okx');
        
        if (!apiKey) {
          throw new Error('No active OKX API key found');
        }

        // Fetch current ticker
        const ticker = await fetchTicker(apiKey, input.symbol);
        
        // Fetch recent OHLCV data
        const ohlcvData = await fetchOHLCV(apiKey, input.symbol, '1h', undefined, 100);
        
        // Convert to candles format
        const candles = ohlcvData.map(d => ({
          timestamp: d.timestamp,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
          volume: d.volume,
        }));
        
        // Calculate indicators
        const closePrices = candles.map(c => c.close);
        const rsiValues = calculateRSI(closePrices, 14);
        const macdData = calculateMACD(closePrices);
        const trend = detectTrend(closePrices);
        
        // Detect patterns
        const patterns = analyzePatterns(candles, trend);
        
        // Build market context
        const marketContext: MarketContext = {
          symbol: input.symbol,
          currentPrice: ticker.last,
          priceChange24h: ((ticker.last - ticker.low) / ticker.low) * 100,
          volume24h: ticker.volume,
          recentCandles: candles,
          indicators: {
            rsi: rsiValues[rsiValues.length - 1],
            macd: {
              macd: macdData.macd[macdData.macd.length - 1],
              signal: macdData.signal[macdData.signal.length - 1],
              histogram: macdData.histogram[macdData.histogram.length - 1],
            },
            trend,
          },
          patterns,
        };
        
        // Generate AI insight
        const insight = await generateTradingInsight(marketContext);
        
        return insight;
      }),

    // Chat with AI assistant
    chat: protectedProcedure
      .input(z.object({
        message: z.string(),
        symbol: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        let marketContext: MarketContext | undefined;
        
        if (input.symbol) {
          const apiKey = await getActiveApiKey(ctx.user.id, 'okx');
          
          if (apiKey) {
            try {
              const ticker = await fetchTicker(apiKey, input.symbol);
              const ohlcvData = await fetchOHLCV(apiKey, input.symbol, '1h', undefined, 50);
              
              const candles = ohlcvData.map(d => ({
                timestamp: d.timestamp,
                open: d.open,
                high: d.high,
                low: d.low,
                close: d.close,
                volume: d.volume,
              }));
              
              marketContext = {
                symbol: input.symbol,
                currentPrice: ticker.last,
                priceChange24h: ((ticker.last - ticker.low) / ticker.low) * 100,
                volume24h: ticker.volume,
                recentCandles: candles,
              };
            } catch (error) {
              console.error('[AI Chat] Failed to fetch market context:', error);
            }
          }
        }
        
        const response = await answerTradingQuestion(input.message, marketContext);
        
        // Save chat message to database
        await saveChatMessage({
          userId: ctx.user.id,
          role: 'user',
          content: input.message,
        });
        
        await saveChatMessage({
          userId: ctx.user.id,
          role: 'assistant',
          content: response,
        });
        
        return { response };
      }),

    // Get chat history
    getChatHistory: protectedProcedure.query(async ({ ctx }) => {
      return await getUserChatHistory(ctx.user.id, 100);
    }),
  }),
});

export type AppRouter = typeof appRouter;
