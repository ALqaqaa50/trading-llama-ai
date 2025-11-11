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

    // Update an existing API key
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        apiKey: z.string(),
        secretKey: z.string(),
        passphrase: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const encrypted = encryptApiKeys(input.apiKey, input.secretKey, input.passphrase);
        
        const db = await import('./db').then(m => m.getDb());
        if (!db) throw new Error('Database not available');
        
        const { apiKeys } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        
        await db.update(apiKeys)
          .set({
            apiKey: encrypted.apiKey,
            secretKey: encrypted.secretKey,
            passphrase: encrypted.passphrase,
            updatedAt: new Date(),
          })
          .where(eq(apiKeys.id, input.id));

        return { success: true };
      }),

    // Delete an API key
    delete: protectedProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ input }) => {
        const db = await import('./db').then(m => m.getDb());
        if (!db) throw new Error('Database not available');
        
        const { apiKeys } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        
        await db.delete(apiKeys).where(eq(apiKeys.id, input.id));

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
        imageUrl: z.string().optional(), // Support image analysis
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
        
        // Check if user is confirming a trade execution
        const confirmationKeywords = ['نعم', 'نفذ', 'موافق', 'أوكي', 'تمام', 'yes', 'ok', 'confirm', 'نعم نفذ'];
        const isConfirmation = confirmationKeywords.some(keyword => 
          input.message.trim().toLowerCase().includes(keyword.toLowerCase())
        );

        let response = await answerTradingQuestion(input.message, marketContext, input.imageUrl);
        
        // If user confirmed, try to extract and execute trade from chat history
        if (isConfirmation) {
          try {
            const chatHistory = await getUserChatHistory(ctx.user.id, 10);
            const lastAssistantMessage = chatHistory.find(msg => msg.role === 'assistant');
            
            if (lastAssistantMessage) {
              // Extract trading parameters from AI's last message
              const content = lastAssistantMessage.content;
              
              // Check if message contains a trading signal
              const hasSignal = content.includes('سعر الدخول') || content.includes('وقف الخسارة') || content.includes('Entry') || content.includes('Stop Loss');
              
              if (hasSignal) {
                const apiKey = await getActiveApiKey(ctx.user.id, 'okx');
                
                if (!apiKey) {
                  response = `⚠️ **لم يتم التنفيذ**\n\nيجب إضافة OKX API Keys أولاً في صفحة "مفاتيح API".`;
                } else {
                  // Extract trade details from message
                  const { placeOrder } = await import('./services/okxTradingService');
                  const { saveTradeExecution } = await import('./db_trading');
                  const { getUserSettings } = await import('./db_settings');
                  
                  // Extract symbol (e.g., BTC/USDT)
                  let symbol = 'BTC/USDT';
                  const symbolMatch = content.match(/([A-Z]{3,10})\/([A-Z]{3,10})/i);
                  if (symbolMatch) {
                    symbol = symbolMatch[0];
                  }
                  
                  // Extract side (buy/sell) from AI recommendation
                  let side: 'buy' | 'sell' = 'buy';
                  
                  // Try to extract from JSON recommendation first
                  const recommendationMatch = content.match(/"recommendation"\s*:\s*"(buy|sell|hold)"/i);
                  if (recommendationMatch && recommendationMatch[1] !== 'hold') {
                    side = recommendationMatch[1] as 'buy' | 'sell';
                  } else {
                    // Fallback: extract from keywords
                    const isBuy = content.includes('شراء') || content.includes('LONG') || content.includes('🟢') || content.includes('صعود');
                    const isSell = content.includes('بيع') || content.includes('SHORT') || content.includes('🔴') || content.includes('هبوط');
                    side = isSell ? 'sell' : 'buy';
                  }
                  
                  // Extract entry price
                  const entryMatch = content.match(/سعر الدخول[:\s*]+\$?([\d,]+\.?\d*)/i) || 
                                   content.match(/Entry[:\s*]+\$?([\d,]+\.?\d*)/i);
                  const entryPrice = entryMatch ? parseFloat(entryMatch[1].replace(/,/g, '')) : undefined;
                  
                  // Extract stop loss
                  const slMatch = content.match(/وقف الخسارة[:\s*]+\$?([\d,]+\.?\d*)/i) ||
                                 content.match(/Stop Loss[:\s*]+\$?([\d,]+\.?\d*)/i);
                  const stopLoss = slMatch ? parseFloat(slMatch[1].replace(/,/g, '')) : undefined;
                  
                  // Extract take profit
                  const tpMatch = content.match(/جني الأرباح 1[:\s*]+\$?([\d,]+\.?\d*)/i) ||
                                 content.match(/Take Profit[:\s*]+\$?([\d,]+\.?\d*)/i);
                  const takeProfit = tpMatch ? parseFloat(tpMatch[1].replace(/,/g, '')) : undefined;
                  
                  // Calculate position size based on risk management
                  const { calculatePositionSize, isDailyLossLimitExceeded } = await import('./db_settings');
                  const { fetchBalance, fetchTicker } = await import('./services/okxService');
                  
                  // Get account balance
                  const balanceData = await fetchBalance(apiKey);
                  const usdtBalance = balanceData.find(b => b.currency === 'USDT');
                  const accountBalance = usdtBalance?.total || 1000; // Fallback to $1000 if balance unavailable
                  
                  // Get current market price if entryPrice not provided
                  let currentPrice = entryPrice;
                  if (!currentPrice) {
                    const ticker = await fetchTicker(apiKey, symbol);
                    currentPrice = ticker.last;
                    console.log(`[Trade Execution] Using current market price: $${currentPrice}`);
                  }
                  
                  // Check daily loss limit
                  const { getTodayPnL } = await import('./db_trading');
                  const todayPnL = await getTodayPnL(ctx.user.id);
                  const dailyLossExceeded = await isDailyLossLimitExceeded(ctx.user.id, todayPnL);
                  
                  if (dailyLossExceeded) {
                    response = `⚠️ **تم إيقاف التداول**\n\nتم الوصول للحد الأقصى للخسارة اليومية. يرجى المحاولة غداً.`;
                    return;
                  }
                  
                  // Calculate position size based on risk percentage and stop loss
                  let amount;
                  if (stopLoss && currentPrice) {
                    amount = await calculatePositionSize(ctx.user.id, accountBalance, currentPrice, stopLoss);
                  } else {
                    // For small balances (<$5), use 70% to ensure minimum order size is met
                    // For larger balances, use 2% for proper risk management
                    const riskPercentage = accountBalance < 5 ? 0.70 : 0.02;
                    const usdValue = accountBalance * riskPercentage;
                    amount = usdValue / currentPrice;
                    console.log(`[Trade Execution] Calculated amount: ${amount} ${symbol.split('/')[0]} (USD value: $${usdValue.toFixed(2)}, price: $${currentPrice}, balance: $${accountBalance})`);
                  }
                  
                  try {
                    // Auto-transfer funds from Funding to Spot if available
                    const { autoTransferToSpot } = await import('./services/okxService');
                    console.log('[Trade Execution] Attempting auto-transfer from Funding to Spot...');
                    try {
                      const transfers = await autoTransferToSpot(apiKey);
                      if (transfers.length > 0) {
                        console.log('[Trade Execution] Auto-transfer completed:', transfers);
                      }
                    } catch (transferError: any) {
                      console.log('[Trade Execution] Auto-transfer failed (not critical):', transferError.message);
                    }
                    
                    // Check balance before execution (now includes transferred funds)
                    const balances = await fetchBalance(apiKey);
                    console.log('[Trade Execution] All balances from OKX (after transfer):', balances);
                    const usdtBalance = balances.find(b => b.currency === 'USDT');
                    console.log('[Trade Execution] USDT balance:', usdtBalance);
                    const availableBalance = usdtBalance ? parseFloat(usdtBalance.total.toString()) : 0;
                    console.log('[Trade Execution] Available balance:', availableBalance);
                    
                    // Get user risk settings
                    const settings = await getUserSettings(ctx.user.id);
                    const riskPercentage = settings?.riskPercentage ? parseFloat(settings.riskPercentage.toString()) : 2;
                    const requiredAmount = (availableBalance * riskPercentage / 100);
                    
                    // Check if balance is sufficient (minimum $0.80 to allow small trades + fees)
                    if (availableBalance < 0.80) {
                      response = `❌ **الرصيد غير كافٍ!**\n\n` +
                        `الرصيد الإجمالي المقروء من **جميع حسابات OKX**: $${availableBalance.toFixed(2)}\n` +
                        `(Funding + Spot + Futures + Margin)\n\n` +
                        `الحد الأدنى المطلوب: $0.80 (لتغطية الصفقة + رسوم التداول)\n\n` +
                        `💡 **الحلول المقترحة:**\n` +
                        `1️⃣ أضف رصيد USDT إلى حسابك في OKX\n` +
                        `2️⃣ تأكد من وجود رصيد في أي من الحسابات (Funding/Spot/Futures)\n` +
                        `3️⃣ تحقق من صحة مفاتيح API وصلاحية "Read"`;
                      
                      // Save chat message
                      await saveChatMessage({
                        userId: ctx.user.id,
                        role: 'assistant',
                        content: response,
                      });
                      
                      return { response };
                    }
                    
                    // Execute the trade on OKX
                    const tradeResult = await placeOrder(ctx.user.id, {
                      symbol,
                      side,
                      type: 'market',
                      amount,
                      price: entryPrice,
                      stopLoss,
                      takeProfit,
                    });
                    
                    if (tradeResult.success) {
                      // Save to database
                      await saveTradeExecution({
                        userId: ctx.user.id,
                        symbol,
                        side,
                        type: 'market',
                        amount: amount.toString(),
                        price: (tradeResult.price || entryPrice || 0).toString(),
                        stopLoss: stopLoss?.toString(),
                        takeProfit: takeProfit?.toString(),
                        status: 'filled',
                        orderId: tradeResult.orderId || '',
                        strategyUsed: 'AI Analysis',
                        aiRecommendation: content.substring(0, 500),
                      });
                      
                      // Send Telegram notification
                      const { sendTelegramNotification } = await import('./services/telegramNotification');
                      await sendTelegramNotification({
                        userId: ctx.user.id,
                        type: 'trade_open',
                        symbol,
                        side,
                        price: tradeResult.price || entryPrice,
                        quantity: amount,
                        message: `🚀 **تم فتح صفقة جديدة!**\n\n` +
                          `النوع: ${side === 'buy' ? 'شراء 🟢 (LONG)' : 'بيع 🔴 (SHORT)'}\n` +
                          `الكمية: ${amount.toFixed(6)}\n` +
                          `Stop Loss: $${stopLoss?.toFixed(2) || 'غير محدد'}\n` +
                          `Take Profit: $${takeProfit?.toFixed(2) || 'غير محدد'}\n` +
                          `رقم الأمر: ${tradeResult.orderId}`,
                      });
                      
                      response = `✅ **تم التنفيذ بنجاح على منصة OKX!**\n\n` +
                        `📊 **تفاصيل الصفقة:**\n` +
                        `━━━━━━━━━━━━━━━━━━━\n` +
                        `🔹 الرمز: **${symbol}**\n` +
                        `🔹 النوع: **${side === 'buy' ? 'شراء 🟢 (LONG)' : 'بيع 🔴 (SHORT)'}**\n` +
                        `🔹 الكمية: **${amount.toFixed(6)}**\n` +
                        `🔹 السعر: **$${(tradeResult.price || entryPrice || 0).toFixed(2)}**\n` +
                        `🔹 Stop Loss: **$${stopLoss?.toFixed(2) || 'غير محدد'}**\n` +
                        `🔹 Take Profit: **$${takeProfit?.toFixed(2) || 'غير محدد'}**\n` +
                        `🔹 رقم الأمر: \`${tradeResult.orderId}\`\n` +
                        `━━━━━━━━━━━━━━━━━━━\n\n` +
                        `🤖 **المراقبة التلقائية مفعّلة!**\n` +
                        `سيتم إغلاق الصفقة تلقائياً عند الوصول لـ Stop Loss أو Take Profit.\n\n` +
                        `📈 يمكنك متابعة جميع صفقاتك في صفحة "📊 صفقاتي"`;
                    } else {
                      // Don't save failed trades to database
                      const errorMessage = tradeResult.error || 'حدث خطأ غير معروف';
                      
                      // Parse OKX error for better user message
                      let userFriendlyError = errorMessage;
                      if (errorMessage.includes('insufficient')) {
                        userFriendlyError = `الرصيد المتاح غير كافٍ لتنفيذ هذه الصفقة.\n\nالرصيد الحالي: $${availableBalance.toFixed(2)}\nالمبلغ المطلوب: ~$${requiredAmount.toFixed(2)}`;
                      } else if (errorMessage.includes('minimum')) {
                        userFriendlyError = 'الكمية أقل من الحد الأدنى المسموح به في المنصة.';
                      } else if (errorMessage.includes('api')) {
                        userFriendlyError = 'خطأ في الاتصال بمنصة OKX. تأكد من صحة مفاتيح API.';
                      } else if (errorMessage.includes('Trade') || errorMessage.includes('permission')) {
                        userFriendlyError = 'مفاتيح API لا تمتلك صلاحية التداول!\n\n🔑 **الحل:**\n1. افتح OKX → Profile → API\n2. اضغط على مفتاحك (Trading bot 123)\n3. Edit Permissions → فعّل "Trade" ✅\n4. جرّب التنفيذ مرة أخرى';
                      }
                      
                      response = `❌ **فشل التنفيذ على OKX**\n\n` +
                        `📋 **السبب:** ${userFriendlyError}\n\n` +
                        `🔍 **الخطأ الكامل من OKX:**\n${errorMessage}\n\n` +
                        `💡 **الحلول المقترحة:**\n` +
                        `1. تحقق من رصيد USDT في حسابك على OKX\n` +
                        `2. تأكد من صحة مفاتيح API في صفحة "مفاتيح API"\n` +
                        `3. تحقق من تفعيل صلاحيات التداول (Trading) في مفاتيح API`;
                    }
                  } catch (execError: any) {
                    console.error('[Trade Execution Error]:', execError);
                    response = `❌ **فشل التنفيذ**\n\nخطأ: ${execError.message}\n\nتأكد من صحة مفاتيح API والرصيد المتاح.`;
                  }
                }
              } else {
                response = `⚠️ لم أجد إشارة تداول في الرسالة السابقة. يرجى طلب تحليل أولاً.`;
              }
            }
          } catch (error: any) {
            console.error('[Trade Execution] Failed:', error);
            response = `❌ حدث خطأ: ${error.message}`;
          }
        }
        
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

  // Trading Execution & Position Management
  trading: router({
    // Place a new trade order
    placeOrder: protectedProcedure
      .input(z.object({
        symbol: z.string(),
        side: z.enum(['buy', 'sell']),
        type: z.enum(['market', 'limit', 'stop_loss', 'take_profit']),
        amount: z.number().positive(),
        price: z.number().positive().optional(),
        stopLoss: z.number().positive().optional(),
        takeProfit: z.number().positive().optional(),
        leverage: z.number().int().min(1).max(125).optional(),
        marginMode: z.enum(['isolated', 'cross']).optional(),
        strategyUsed: z.string().optional(),
        aiRecommendation: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { placeOrder } = await import('./services/okxTradingService');
        const { saveTradeExecution } = await import('./db_trading');
        
        const result = await placeOrder(ctx.user.id, input);
        
        // Save to database
        await saveTradeExecution({
          userId: ctx.user.id,
          orderId: result.orderId || null,
          symbol: input.symbol,
          side: input.side,
          type: input.type,
          amount: input.amount.toString(),
          price: input.price?.toString() || null,
          stopLoss: input.stopLoss?.toString() || null,
          takeProfit: input.takeProfit?.toString() || null,
          leverage: input.leverage || null,
          marginMode: input.marginMode || null,
          status: result.success ? 'filled' : 'failed',
          averagePrice: result.price?.toString() || null,
          strategyUsed: input.strategyUsed || null,
          aiRecommendation: input.aiRecommendation || null,
          errorMessage: result.error || null,
        });
        
        return result;
      }),

    // Get open positions
    getOpenPositions: protectedProcedure
      .input(z.object({
        symbol: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const { getOpenPositions } = await import('./services/okxTradingService');
        return await getOpenPositions(ctx.user.id, input.symbol);
      }),

    // Close a position
    closePosition: protectedProcedure
      .input(z.object({
        symbol: z.string(),
        amount: z.number().positive().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { closePosition } = await import('./services/okxTradingService');
        const { saveTradeExecution, getOpenTrades, updateTradeExecution } = await import('./db_trading');
        
        const result = await closePosition(ctx.user.id, input.symbol, input.amount);
        
        // Update the original trade with P&L
        const openTrades = await getOpenTrades(ctx.user.id);
        const originalTrade = openTrades.find(t => t.symbol === input.symbol);
        
        if (originalTrade && result.success) {
          const entryPrice = parseFloat(originalTrade.price || '0');
          const exitPrice = result.price || 0;
          const amount = parseFloat(originalTrade.amount);
          
          const pnl = originalTrade.side === 'buy' 
            ? (exitPrice - entryPrice) * amount
            : (entryPrice - exitPrice) * amount;
          
          const pnlPercent = ((pnl / (entryPrice * amount)) * 100);
          
          await updateTradeExecution(originalTrade.id, {
            pnl: pnl.toString(),
            pnlPercent: pnlPercent.toString(),
            closedAt: new Date(),
          });
        }
        
        return result;
      }),

    // Get trade history
    getTradeHistory: protectedProcedure
      .input(z.object({
        limit: z.number().int().min(1).max(500).optional(),
      }))
      .query(async ({ ctx, input }) => {
        const { getTradeExecutionsByUserId } = await import('./db_trading');
        return await getTradeExecutionsByUserId(ctx.user.id, input.limit);
      }),

    // Get open trades from database
    getOpenTrades: protectedProcedure
      .query(async ({ ctx }) => {
        const { getOpenTrades } = await import('./db_trading');
        return await getOpenTrades(ctx.user.id);
      }),

    // Get P&L statistics
    getPnLStats: protectedProcedure
      .query(async ({ ctx }) => {
        const { calculateTotalPnL } = await import('./db_trading');
        return await calculateTotalPnL(ctx.user.id);
      }),

    // Get account balance
    getBalance: protectedProcedure
      .query(async ({ ctx }) => {
        const { getAccountBalance } = await import('./services/okxTradingService');
        return await getAccountBalance(ctx.user.id);
      }),

    // Get performance statistics
    getPerformanceStats: protectedProcedure
      .input(z.object({
        timeRange: z.enum(['week', 'month', 'all']).optional(),
      }))
      .query(async ({ ctx, input }) => {
        const { getTradeExecutionsByUserId } = await import('./db_trading');
        const trades = await getTradeExecutionsByUserId(ctx.user.id, 1000);
        
        // Filter by time range
        let filteredTrades = trades;
        if (input.timeRange && input.timeRange !== 'all') {
          const now = new Date();
          const cutoff = new Date();
          if (input.timeRange === 'week') {
            cutoff.setDate(now.getDate() - 7);
          } else if (input.timeRange === 'month') {
            cutoff.setMonth(now.getMonth() - 1);
          }
          filteredTrades = trades.filter(t => new Date(t.createdAt) >= cutoff);
        }
        
        // Calculate statistics
        const totalTrades = filteredTrades.length;
        const closedTrades = filteredTrades.filter(t => t.pnl !== null);
        
        let totalPnL = 0;
        let winningTrades = 0;
        let losingTrades = 0;
        let totalWinAmount = 0;
        let totalLossAmount = 0;
        let bestTrade = 0;
        let worstTrade = 0;
        
        for (const trade of closedTrades) {
          const pnl = parseFloat(trade.pnl || '0');
          totalPnL += pnl;
          
          if (pnl > 0) {
            winningTrades++;
            totalWinAmount += pnl;
            if (pnl > bestTrade) bestTrade = pnl;
          } else if (pnl < 0) {
            losingTrades++;
            totalLossAmount += pnl;
            if (pnl < worstTrade) worstTrade = pnl;
          }
        }
        
        const winRate = closedTrades.length > 0 ? (winningTrades / closedTrades.length) * 100 : 0;
        const avgWin = winningTrades > 0 ? totalWinAmount / winningTrades : 0;
        const avgLoss = losingTrades > 0 ? totalLossAmount / losingTrades : 0;
        const profitFactor = Math.abs(totalLossAmount) > 0 ? totalWinAmount / Math.abs(totalLossAmount) : 0;
        
        return {
          totalPnL,
          winRate,
          totalTrades,
          winningTrades,
          losingTrades,
          avgWin,
          avgLoss,
          bestTrade,
          worstTrade,
          profitFactor,
        };
      }),

    // Get real technical indicators (calculated from actual data)
    getRealIndicators: protectedProcedure
      .input(z.object({
        symbol: z.string(),
        timeframe: z.string().optional(),
        limit: z.number().int().min(50).max(500).optional(),
      }))
      .query(async ({ ctx, input }) => {
        const { fetchAndCalculateIndicators } = await import('./services/realIndicators');
        return await fetchAndCalculateIndicators(
          ctx.user.id,
          input.symbol,
          input.timeframe,
          input.limit
        );
      }),
  }),

  // Trading Bot Router
  bot: router({
    start: protectedProcedure
      .input(z.object({
        symbol: z.string(),
        timeframe: z.string().default('1m'),
        rsiOverbought: z.number().default(70),
        rsiOversold: z.number().default(30),
        useMACD: z.boolean().default(true),
        useCandlestickPatterns: z.boolean().default(true),
        useAIConfirmation: z.boolean().default(true),
        maxTradesPerDay: z.number().default(10),
        maxDailyLoss: z.number().default(100),
        positionSizePercent: z.number().default(2),
        stopLossPercent: z.number().default(2),
        takeProfitPercent: z.number().default(4),
        leverage: z.number().default(1),
        tradeType: z.enum(['spot', 'futures']).default('spot'),
        marginMode: z.enum(['isolated', 'cross']).default('isolated'),
      }))
      .mutation(async ({ ctx, input }) => {
        const { startBot } = await import('./services/tradingBot');
        
        const config = {
          userId: ctx.user.id,
          symbol: input.symbol,
          timeframe: input.timeframe,
          enabled: true,
          rsiOverbought: input.rsiOverbought,
          rsiOversold: input.rsiOversold,
          useMACD: input.useMACD,
          useCandlestickPatterns: input.useCandlestickPatterns,
          useAIConfirmation: input.useAIConfirmation,
          maxTradesPerDay: input.maxTradesPerDay,
          maxDailyLoss: input.maxDailyLoss,
          positionSizePercent: input.positionSizePercent,
          stopLossPercent: input.stopLossPercent,
          takeProfitPercent: input.takeProfitPercent,
          leverage: input.leverage,
          tradeType: input.tradeType,
          marginMode: input.marginMode,
        };
        
        const success = await startBot(config);
        return { success };
      }),

    stop: protectedProcedure
      .mutation(async ({ ctx }) => {
        const { stopBot } = await import('./services/tradingBot');
        const success = stopBot(ctx.user.id);
        return { success };
      }),

    getStatus: protectedProcedure
      .query(async ({ ctx }) => {
        const { getBotStatus } = await import('./services/tradingBot');
        const status = getBotStatus(ctx.user.id);
        return status;
      }),
  }),
  
  // User Settings (Risk Management)
  settings: router({
    getSettings: protectedProcedure
      .query(async ({ ctx }) => {
        const { getUserSettings } = await import('./db_settings');
        return await getUserSettings(ctx.user.id);
      }),
    
    updateSettings: protectedProcedure
      .input(z.object({
        riskPercentage: z.string().optional(),
        maxDailyLoss: z.string().optional(),
        maxOpenTrades: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { upsertUserSettings } = await import('./db_settings');
        await upsertUserSettings({
          userId: ctx.user.id,
          ...input,
        });
        return { success: true };
      }),
  }),
  
  // Telegram Notifications
  telegram: router({
    // Get Telegram settings
    getSettings: protectedProcedure
      .query(async ({ ctx }) => {
        const { getTelegramSettings } = await import('./services/telegramNotification');
        return await getTelegramSettings(ctx.user.id);
      }),
    
    // Update Telegram settings
    updateSettings: protectedProcedure
      .input(z.object({
        chatId: z.string().optional(),
        enabled: z.number().optional(),
        notifyOnTradeOpen: z.number().optional(),
        notifyOnTradeClose: z.number().optional(),
        notifyOnStopLoss: z.number().optional(),
        notifyOnTakeProfit: z.number().optional(),
        notifyOnDailyLossLimit: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { updateTelegramSettings } = await import('./services/telegramNotification');
        await updateTelegramSettings(ctx.user.id, input);
        return { success: true };
      }),
    
    // Test Telegram notification
    testNotification: protectedProcedure
      .mutation(async ({ ctx }) => {
        const { sendTelegramNotification } = await import('./services/telegramNotification');
        const result = await sendTelegramNotification({
          userId: ctx.user.id,
          type: 'trade_open',
          symbol: 'BTC/USDT',
          side: 'buy',
          price: 50000,
          message: '🦙 **اختبار إشعارات Trading Llama AI**\n\nهذه رسالة اختبار للتأكد من عمل الإشعارات بشكل صحيح!',
        });
        return { success: result };
      }),
  }),
});

export type AppRouter = typeof appRouter;
