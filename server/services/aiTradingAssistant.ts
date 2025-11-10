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
  
  let contextText = `تحليل السوق لزوج ${symbol}:\n\n`;
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
  
  const systemPrompt = `أنت خبير تداول محترف متخصص في تحليل أسواق العملات الرقمية. لديك خبرة عميقة في:
- التحليل الفني والأساسي
- أنماط الشموع اليابانية
- المؤشرات الفنية (RSI, MACD, Bollinger Bands)
- إدارة المخاطر ونظام Van Tharp

مهمتك هي تحليل بيانات السوق المقدمة وتقديم توصية تداول واضحة مع التبرير المنطقي.

قواعد التحليل:
1. كن موضوعياً ومبنياً على البيانات
2. اذكر نقاط القوة والضعف في التحليل
3. حدد مستويات الدخول والخروج المقترحة
4. قيّم نسبة المخاطرة إلى العائد
5. كن صريحاً إذا كانت البيانات غير كافية أو متضاربة

يجب أن يكون ردك بصيغة JSON بالشكل التالي:
{
  "recommendation": "buy" أو "sell" أو "hold",
  "confidence": رقم من 0 إلى 100,
  "reasoning": "شرح مفصل للتوصية",
  "keyPoints": ["نقطة 1", "نقطة 2", "نقطة 3"]
}`;

  try {
    const response = await invokeLLM({
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

/**
 * Answer general trading questions using AI
 */
export async function answerTradingQuestion(
  question: string,
  marketContext?: MarketContext
): Promise<string> {
  const systemPrompt = `أنت Trading Llama AI، مساعد تداول ذكي متخصص في العملات الرقمية.
لديك خبرة في:
- التحليل الفني والأساسي
- استراتيجيات التداول
- إدارة المخاطر
- أنماط الشموع اليابانية
- المؤشرات الفنية

أجب على أسئلة المستخدم بوضوح واحترافية. كن صريحاً وتعليمياً.`;

  let userMessage = question;
  if (marketContext) {
    userMessage = `${buildMarketContext(marketContext)}\n\nالسؤال: ${question}`;
  }

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });

    const content = response.choices[0].message.content;
    return typeof content === 'string' ? content : JSON.stringify(content);
  } catch (error) {
    console.error('[AI Trading Assistant] Error answering question:', error);
    return 'عذراً، حدث خطأ في معالجة سؤالك. يرجى المحاولة مرة أخرى.';
  }
}
