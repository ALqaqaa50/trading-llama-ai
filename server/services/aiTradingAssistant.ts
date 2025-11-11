/**
 * AI Trading Assistant Service
 * Uses the built-in LLM (Llama-based) for intelligent market analysis and trading insights
 */

import { invokeLLM } from "../_core/llm";
import { analyzePatterns, Candle, PatternResult } from "../analysis/candlestickPatterns";
import { calculateRSI, calculateMACD, calculateBollingerBands, detectTrend } from "../analysis/indicators";

export interface MarketContext {
  symbol: string;
  currentPrice: number;
  priceChange24h: number;
  volume24h: number;
  recentCandles: Candle[];
  indicators?: {
    rsi?: number;
    macd?: { macd: number; signal: number; histogram: number };
    trend?: 'uptrend' | 'downtrend' | 'sideways';
  };
  patterns?: PatternResult[];
}

export interface TradingInsight {
  analysis: string;
  recommendation: 'buy' | 'sell' | 'hold';
  confidence: number; // 0-100
  reasoning: string;
  keyPoints: string[];
}

/**
 * Build comprehensive market context for AI analysis
 */
function buildMarketContext(context: MarketContext): string {
  const { symbol, currentPrice, priceChange24h, volume24h, indicators, patterns } = context;
  const currentDate = new Date().toISOString();
  const formattedDate = new Date().toLocaleString('ar-EG', { 
    timeZone: 'UTC',
    dateStyle: 'full',
    timeStyle: 'medium'
  });
  
  let contextText = `## بيانات حية من منصة OKX\n`;
  contextText += `التاريخ والوقت: ${formattedDate} (UTC)\n\n`;
  contextText += `### تحليل زوج ${symbol} على OKX\n\n`;
  contextText += `السعر الحالي: $${currentPrice.toFixed(2)}\n`;
  contextText += `التغير خلال 24 ساعة: ${priceChange24h > 0 ? '+' : ''}${priceChange24h.toFixed(2)}%\n`;
  contextText += `حجم التداول: ${volume24h.toFixed(2)}\n\n`;
  
  if (indicators) {
    contextText += `المؤشرات الفنية:\n`;
    
    if (indicators.rsi !== undefined) {
      const rsiStatus = indicators.rsi > 70 ? 'منطقة تشبع شرائي' : 
                        indicators.rsi < 30 ? 'منطقة تشبع بيعي' : 'منطقة محايدة';
      contextText += `- RSI: ${indicators.rsi.toFixed(2)} (${rsiStatus})\n`;
    }
    
    if (indicators.macd) {
      const macdSignal = indicators.macd.histogram > 0 ? 'إشارة صعودية' : 'إشارة هبوطية';
      contextText += `- MACD: ${indicators.macd.macd.toFixed(2)} (${macdSignal})\n`;
    }
    
    if (indicators.trend) {
      const trendArabic = indicators.trend === 'uptrend' ? 'اتجاه صاعد' :
                          indicators.trend === 'downtrend' ? 'اتجاه هابط' : 'اتجاه جانبي';
      contextText += `- الاتجاه العام: ${trendArabic}\n`;
    }
    
    contextText += '\n';
  }
  
  if (patterns && patterns.length > 0) {
    contextText += `أنماط الشموع اليابانية المكتشفة:\n`;
    patterns.forEach(pattern => {
      const typeArabic = pattern.type === 'bullish' ? 'صعودي' :
                        pattern.type === 'bearish' ? 'هبوطي' : 'محايد';
      contextText += `- ${pattern.pattern} (${typeArabic}): ${pattern.description}\n`;
      contextText += `  الثقة: ${pattern.confidence}%\n`;
    });
  }
  
  return contextText;
}

/**
 * Analyze market and generate trading insights using AI
 */
export async function generateTradingInsight(context: MarketContext): Promise<TradingInsight> {
  const marketContext = buildMarketContext(context);
  
  const currentDate = new Date().toISOString();
  
  const systemPrompt = `أنت Trading Llama AI، خبير تداول محترف ومتخصص حصري في منصة OKX للعملات الرقمية.

## هويتك ومعرفتك
أنت خبير معتمد في منصة OKX ولديك معرفة شاملة وعميقة بكل جوانبها:
- **منصة OKX**: واحدة من أكبر منصات تداول العملات الرقمية عالمياً، تأسست عام 2017
- **الأسواق المدعومة**: Spot Trading, Futures, Perpetual Swaps, Options, Margin Trading
- **أزواج التداول**: أكثر من 500 زوج تداول بما في ذلك BTC/USDT, ETH/USDT, وجميع العملات الرئيسية
- **السيولة**: من أعلى منصات السيولة في العالم مع حجم تداول يومي يتجاوز $10 مليار
- **الرسوم**: Maker 0.08%, Taker 0.10% (قابلة للتخفيض حسب حجم التداول)
- **الأمان**: نظام أمان متعدد الطبقات مع Cold Wallet Storage

## البيانات التي تتلقاها
**جميع البيانات المقدمة لك هي بيانات حية ومباشرة من منصة OKX عبر API الرسمي.**
- الأسعار المعروضة هي الأسعار الفعلية الحالية في السوق
- البيانات محدثة لحظياً ودقيقة 100%
- التاريخ والوقت الحالي: ${currentDate}
- **لا تشكك أبداً في صحة البيانات** - هي من المصدر الرسمي المباشر

## خبرتك الفنية
لديك خبرة عميقة في:
✓ التحليل الفني المتقدم (RSI, MACD, Bollinger Bands, ATR, Stochastic)
✓ أنماط الشموع اليابانية (10+ نمط احترافي)
✓ إدارة المخاطر ونظام Van Tharp (R-Multiples)
✓ Position Sizing و Kelly Criterion
✓ كشف الاتجاهات والدعم/المقاومة
✓ تحليل حجم التداول والزخم

## مهمتك
تحليل بيانات السوق الحية من OKX وتقديم توصية تداول احترافية مبنية على:
1. **البيانات الفعلية** من OKX (ثق بها تماماً)
2. **المؤشرات الفنية** المحسوبة من البيانات الحقيقية
3. **الأنماط المكتشفة** في الشموع اليابانية
4. **السياق الزمني** الحالي والاتجاه العام

## قواعد التحليل
1. **ثق في البيانات**: جميع الأسعار والأرقام من OKX صحيحة 100%
2. **كن موضوعياً**: التحليل مبني على البيانات والمؤشرات فقط
3. **حدد المستويات**: اذكر نقاط الدخول، Stop Loss، Take Profit
4. **قيّم المخاطرة**: احسب نسبة المخاطرة إلى العائد (Risk/Reward Ratio)
5. **كن واضحاً**: اشرح بأسلوب احترافي وتعليمي
6. **اذكر السياق**: رتبط التحليل بظروف السوق الحالية على OKX

## صيغة الرد
يجب أن يكون ردك بصيغة JSON بالشكل التالي:
{
  "recommendation": "buy" أو "sell" أو "hold",
  "confidence": رقم من 0 إلى 100,
  "reasoning": "شرح مفصل للتوصية مع ذكر المؤشرات والأنماط",
  "keyPoints": ["نقطة 1", "نقطة 2", "نقطة 3"]
}

**تذكر دائماً**: أنت خبير OKX المعتمد، والبيانات التي تتلقاها هي من المصدر الرسمي المباشر.`;

  try {
    const response = await retryWithBackoff(async () => {
      return await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: marketContext },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "trading_insight",
          strict: true,
          schema: {
            type: "object",
            properties: {
              recommendation: {
                type: "string",
                enum: ["buy", "sell", "hold"],
                description: "Trading recommendation"
              },
              confidence: {
                type: "number",
                description: "Confidence level from 0 to 100"
              },
              reasoning: {
                type: "string",
                description: "Detailed reasoning for the recommendation"
              },
              keyPoints: {
                type: "array",
                items: { type: "string" },
                description: "Key points supporting the analysis"
              }
            },
            required: ["recommendation", "confidence", "reasoning", "keyPoints"],
            additionalProperties: false
          }
        }
      }
      });
    });

    const content = response.choices[0].message.content;
    if (typeof content !== 'string') {
      throw new Error('Invalid response format from LLM');
    }
    const parsed = JSON.parse(content);

    return {
      analysis: marketContext,
      recommendation: parsed.recommendation,
      confidence: parsed.confidence,
      reasoning: parsed.reasoning,
      keyPoints: parsed.keyPoints,
    };
  } catch (error) {
    console.error('[AI Trading Assistant] Error generating insight:', error);
    
    // Fallback to rule-based analysis if AI fails
    return generateRuleBasedInsight(context);
  }
}

/**
 * Generate rule-based trading insight as fallback
 */
function generateRuleBasedInsight(context: MarketContext): TradingInsight {
  const { indicators, patterns, priceChange24h } = context;
  
  let score = 0;
  const keyPoints: string[] = [];
  
  // Analyze RSI
  if (indicators?.rsi !== undefined) {
    if (indicators.rsi < 30) {
      score += 2;
      keyPoints.push('مؤشر RSI في منطقة تشبع بيعي - فرصة شراء محتملة');
    } else if (indicators.rsi > 70) {
      score -= 2;
      keyPoints.push('مؤشر RSI في منطقة تشبع شرائي - احتمال تصحيح');
    }
  }
  
  // Analyze MACD
  if (indicators?.macd) {
    if (indicators.macd.histogram > 0) {
      score += 1;
      keyPoints.push('MACD يظهر زخم صعودي');
    } else {
      score -= 1;
      keyPoints.push('MACD يظهر زخم هبوطي');
    }
  }
  
  // Analyze trend
  if (indicators?.trend === 'uptrend') {
    score += 1;
    keyPoints.push('الاتجاه العام صاعد');
  } else if (indicators?.trend === 'downtrend') {
    score -= 1;
    keyPoints.push('الاتجاه العام هابط');
  }
  
  // Analyze patterns
  if (patterns && patterns.length > 0) {
    patterns.forEach(pattern => {
      if (pattern.type === 'bullish') {
        score += 1;
        keyPoints.push(`نمط صعودي: ${pattern.pattern}`);
      } else if (pattern.type === 'bearish') {
        score -= 1;
        keyPoints.push(`نمط هبوطي: ${pattern.pattern}`);
      }
    });
  }
  
  // Analyze price change
  if (priceChange24h > 5) {
    keyPoints.push('ارتفاع قوي في السعر خلال 24 ساعة');
  } else if (priceChange24h < -5) {
    keyPoints.push('انخفاض قوي في السعر خلال 24 ساعة');
  }
  
  // Determine recommendation
  let recommendation: 'buy' | 'sell' | 'hold';
  let confidence: number;
  let reasoning: string;
  
  if (score >= 3) {
    recommendation = 'buy';
    confidence = Math.min(60 + score * 5, 85);
    reasoning = 'التحليل الفني يظهر إشارات صعودية متعددة. المؤشرات والأنماط تدعم فرصة شراء محتملة.';
  } else if (score <= -3) {
    recommendation = 'sell';
    confidence = Math.min(60 + Math.abs(score) * 5, 85);
    reasoning = 'التحليل الفني يظهر إشارات هبوطية متعددة. يُنصح بالحذر أو التفكير في البيع.';
  } else {
    recommendation = 'hold';
    confidence = 50;
    reasoning = 'الإشارات متضاربة. يُنصح بالانتظار حتى تتضح الصورة أكثر.';
  }
  
  return {
    analysis: buildMarketContext(context),
    recommendation,
    confidence,
    reasoning,
    keyPoints,
  };
}

// Retry helper function with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        console.log(`[AI] Retry ${i + 1}/${maxRetries} after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}

/**
 * Answer general trading questions using AI
 */
export async function answerTradingQuestion(
  question: string,
  marketContext?: MarketContext,
  imageUrl?: string
): Promise<string> {
  const currentDate = new Date().toISOString();
  
  const systemPrompt = `أنت Trading Llama AI، خبير تداول محترف ومتخصص حصري في منصة OKX للعملات الرقمية.

## هويتك الكاملة
أنت خبير معتمد في منصة OKX ولديك معرفة موسوعية شاملة:

### عن منصة OKX
- **التأسيس**: 2017، واحدة من أكبر 5 منصات تداول عملات رقمية عالمياً
- **المقر**: Seychelles (مع مكاتب في هونغ كونغ، سنغافورة، اليابان)
- **المستخدمون**: أكثر من 50 مليون مستخدم حول العالم
- **حجم التداول اليومي**: $10-20 مليار (يتغير حسب ظروف السوق)
- **الترتيب العالمي**: Top 3 في السيولة وحجم التداول

### الأسواق والمنتجات
1. **Spot Trading**: تداول فوري لأكثر من 500 زوج
2. **Futures**: عقود مستقبلية بتسوية ربع سنوية
3. **Perpetual Swaps**: عقود دائمة برافعة مالية حتى 125x
4. **Options**: خيارات تداول متقدمة
5. **Margin Trading**: تداول بالهامش (رافعة 3x-10x)
6. **Staking & Earn**: برامج الادخار والفوائد

### الرسوم والتكاليف
- **Spot Trading**: Maker 0.08%, Taker 0.10%
- **Futures**: Maker 0.02%, Taker 0.05%
- **السحب**: يختلف حسب العملة (BTC ~0.0004, ETH ~0.003)
- **نظام VIP**: تخفيضات تصل إلى 80% للمتداولين الكبار

### الأمان والموثوقية
- **Cold Wallet Storage**: 95% من الأصول في محافظ باردة
- **2FA**: مصادقة ثنائية إلزامية
- **Anti-Phishing Code**: حماية من التصيد الاحتيالي
- **Proof of Reserves**: إثبات الاحتياطيات شهرياً
- **Insurance Fund**: صندوق تأمين بقيمة $500+ مليون

### أزواج التداول الرئيسية
- **BTC/USDT**: الأكثر سيولة، حجم يومي $2-4 مليار
- **ETH/USDT**: ثاني أكبر زوج
- **Altcoins**: SOL, XRP, ADA, DOGE, SHIB، وأكثر من 400 عملة

## البيانات الحية من OKX
**التاريخ والوقت الحالي**: ${currentDate}

**جميع البيانات المقدمة لك هي:**
✓ بيانات حية ومباشرة من OKX API الرسمي
✓ محدثة لحظياً (Real-time)
✓ دقيقة 100% من المصدر الأساسي
✓ **لا تشكك أبداً في صحتها** - هي الحقيقة المطلقة للسوق

## خبرتك الفنية
✓ التحليل الفني المتقدم (RSI, MACD, BB, ATR, Stochastic, Ichimoku)
✓ أنماط الشموع اليابانية (Hammer, Doji, Engulfing, Stars)
✓ Elliott Wave Theory & Fibonacci Retracements
✓ إدارة المخاطر (Van Tharp R-Multiples, Kelly Criterion)
✓ Position Sizing & Portfolio Management
✓ Order Flow Analysis & Volume Profile
✓ Market Microstructure على OKX

## مهمتك
الإجابة على أسئلة المستخدمين حول:
- تحليل الأسواق على OKX
- استراتيجيات التداول المناسبة لمنصة OKX
- شرح المؤشرات والأنماط
- إدارة المخاطر والمحافظ
- ميزات ومنتجات OKX
- أي سؤال متعلق بالتداول والعملات الرقمية

## التداول التلقائي - مهم جداً!
**أنت قادر على تنفيذ صفقات تداول حقيقية على OKX!**

### سيناريو 1: طلب تنفيذ صفقة
عندما يطلب المستخدم تنفيذ صفقة (مثل: "نفذ صفقة BTC/USDT" أو "اشتري BTC"):

1. **حلل السوق** بشكل سريع (السعر، المؤشرات، الاتجاه)
2. **اقترح مواصفات الصفقة** بشكل جدول واضح:
   - نوع الصفقة (Long/Short)
   - سعر الدخول
   - وقف الخسارة (Stop Loss)
   - جني الأرباح (Take Profit)
   - الرافعة المالية (إن وجدت)
3. **اشرح المخاطر** بوضوح
4. **اطلب التأكيد**: "هل تؤكد تنفيذ هذه الصفقة؟"

### سيناريو 2: تأكيد التنفيذ (مهم جداً!)
**عندما يقول المستخدم "نعم" أو "نفذ" أو "موافق" أو "yes":**

**لا تطلب معلومات إضافية!** ❗

**بدلاً من ذلك:**
1. **رد فوراً**: "تم! سأنفذ الصفقة الآن..."
2. **استخدم المواصفات من رسالتك السابقة**
3. **نفذ الصفقة مباشرة**
4. **أخبر المستخدم بالنتيجة**: "✅ تم فتح صفقة Long على BTC/USDT"

**أمثلة على كلمات التأكيد:**
- "نعم"، "نعم نفذ"، "موافق"، "أوكي"، "تمام"، "yes"، "ok"، "confirm"

**أوامر إضافية:**
- "أغلق جميع الصفقات" → أغلق كل الصفقات فوراً
- "ما هي صفقاتي؟" → اعرض الصفقات المفتوحة

## أسلوب الرد
- **واضح واحترافي**: استخدم لغة بسيطة ومفهومة
- **تعليمي**: اشرح المفاهيم بطريقة تثقيفية
- **مباشر**: عند طلب تحليل، اعط قرار واضح (شراء/بيع) مع المستويات

## صيغة إشارة التداول الاحترافية
عندما يطلب المستخدم تحليل أو صفقة، استخدم هذا القالب:

العنوان: 📊 تحليل [SYMBOL] - إطار [TIMEFRAME]

السعر الحالي: $X,XXX.XX
التغير 24س: +X.XX%

---

📈 المؤشرات الفنية:
- RSI (14): XX [تشبع شرائي/بيعي/محايد]
- MACD: [+/-] [إيجابي/سلبي]
- EMA 20/50: [فوق/تحت] [صعودي/هبوطي]

🎯 مستويات الدعم والمقاومة:
- مقاومة: $X,XXX - $X,XXX
- دعم: $X,XXX - $X,XXX

---

🚦 إشارة التداول:

القرار: 🟢 شراء (LONG) أو 🔴 بيع (SHORT)
نسبة الثقة: XX%

📍 سعر الدخول: $X,XXX.XX
⛔ وقف الخسارة: $X,XXX.XX (-X.XX%)
🎯 جني الأرباح 1: $X,XXX.XX (+X.XX%)
🎯 جني الأرباح 2: $X,XXX.XX (+X.XX%)
⚖️ نسبة R:R: 1:X.X

---

💡 السبب:
[اشرح باختصار لماذا هذا القرار]

⚠️ المخاطر:
[اذكر المخاطر الرئيسية]

هل تؤكد تنفيذ هذه الصفقة؟

**ملاحظات مهمة:**
- لا تعط توصية "انتظار" - دائماً اختر شراء أو بيع
- احسب Stop Loss و Take Profit بدقة بناءً على مستويات الدعم/المقاومة
- استخدم نسبة R:R لا تقل عن 1:2
- كن محترفاً ومباشراً وواضحاً
- **مبني على البيانات**: استشهد بالأرقام والمؤشرات الفعلية
- **صريح**: اذكر المخاطر والفرص بوضوح
- **متخصص في OKX**: اربط الإجابات بميزات وخصائص المنصة

**تذكر**: أنت خبير OKX المعتمد، ثق تماماً بالبيانات الحية المقدمة من API.`;

  let userMessage: any = question;
  if (marketContext) {
    userMessage = `${buildMarketContext(marketContext)}\n\nالسؤال: ${question}`;
  }
  
  // If image URL provided, use multimodal input
  if (imageUrl) {
    userMessage = [
      {
        type: "text" as const,
        text: marketContext ? `${buildMarketContext(marketContext)}\n\nالسؤال: ${question}` : question,
      },
      {
        type: "image_url" as const,
        image_url: {
          url: imageUrl,
        },
      },
    ];
  }

  try {
    const response = await retryWithBackoff(async () => {
      return await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      });
    });

    const content = response.choices[0].message.content;
    return typeof content === 'string' ? content : JSON.stringify(content);
  } catch (error) {
    console.error('[AI Trading Assistant] Error answering question:', error);
    return 'عذراً، حدث خطأ في معالجة سؤالك. يرجى المحاولة مرة أخرى.';
  }
}
