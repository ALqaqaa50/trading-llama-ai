# 🤖 Trading Llama AI - Intelligent Crypto Trading System

**An advanced, AI-powered cryptocurrency trading bot built with Llama LLM, featuring automated technical analysis, real-time market monitoring, and intelligent trade execution on OKX exchange.**

---

## 🌟 Features

### Core Capabilities
- **AI-Powered Analysis**: Leverages Llama LLM for intelligent market analysis and trading decisions
- **Real Technical Indicators**: Calculates RSI, MACD, Bollinger Bands, ATR, and Stochastic using Python TA-Lib from actual OHLCV data
- **Japanese Candlestick Patterns**: Detects 10+ patterns (Doji, Hammer, Engulfing, Morning/Evening Star, etc.)
- **Automated Trading Bot**: 24/7 continuous market monitoring with automatic trade execution
- **OKX Integration**: Direct connection to OKX exchange for live data and order execution
- **Advanced Risk Management**: Position sizing, Stop Loss/Take Profit, Van Tharp R-Multiples, Kelly Criterion

### User Interface
- **Chat Interface**: Natural language interaction with AI trading assistant
- **Trading Dashboard**: Real-time market data, price charts, and portfolio overview
- **My Trades Page**: View open positions, trade history, and P&L statistics
- **Bot Control Panel**: Start/stop automated trading, configure strategies, monitor bot activity

### Security
- **Encrypted API Keys**: AES encryption for secure storage of OKX API credentials
- **User Authentication**: Built-in Manus OAuth for secure access
- **Database Protection**: Sensitive data stored in encrypted format

---

## 🏗️ Technology Stack

### Frontend
- **React 19** with TypeScript
- **Tailwind CSS 4** for styling
- **tRPC 11** for type-safe API calls
- **Wouter** for routing
- **shadcn/ui** components

### Backend
- **Node.js** with Express 4
- **tRPC 11** for API layer
- **Drizzle ORM** for database operations
- **MySQL/TiDB** database
- **Python 3.11** with TA-Lib for technical indicators

### Trading & AI
- **ccxt** library for OKX exchange integration
- **Llama LLM** (via Manus built-in API) for intelligent analysis
- **Python TA-Lib** for real technical indicator calculations

---

## 📦 Installation

### Prerequisites
- Node.js 22+
- Python 3.11+
- pnpm package manager
- OKX account with API keys

### Setup Steps

1. **Clone the repository**
```bash
git clone https://github.com/YOUR_USERNAME/trading-llama-ai.git
cd trading-llama-ai
```

2. **Install dependencies**
```bash
pnpm install
pip3 install pandas numpy ta-lib
```

3. **Configure environment variables**

Create a `.env` file (or use Manus platform environment):
```env
DATABASE_URL=mysql://user:password@host:port/database
JWT_SECRET=your_jwt_secret_here
VITE_APP_TITLE=Trading Llama AI
```

4. **Initialize database**
```bash
pnpm db:push
```

5. **Start development server**
```bash
pnpm dev
```

The application will be available at `http://localhost:3000`

---

## 🚀 Usage

### 1. Set Up OKX API Keys

- Navigate to "إعداد المفاتيح" (API Key Setup)
- Enter your OKX API Key, Secret Key, and Passphrase
- Keys are encrypted and stored securely in the database

### 2. Chat with AI Assistant

- Go to the main dashboard
- Ask questions like:
  - "حلل زوج BTC/USDT على إطار 15 دقيقة"
  - "ما هي أفضل نقطة دخول الآن؟"
  - "نفذ صفقة شراء بحجم 2% من رأس المال"

### 3. View Your Trades

- Navigate to "صفقاتي" (My Trades)
- View open positions with real-time P&L
- See complete trade history
- Monitor performance statistics

### 4. Automated Trading Bot

- Go to "التحكم بالبوت" (Bot Control)
- Configure strategy parameters (RSI thresholds, MACD signals)
- Set safety limits (max trades per day, max loss)
- Click "تشغيل البوت" to start automated trading

---

## 📊 Database Schema

The system uses 8 specialized tables:

| Table | Purpose |
|-------|---------|
| `users` | User authentication and profiles |
| `api_keys` | Encrypted OKX API credentials |
| `market_data` | Historical OHLCV price data |
| `trading_signals` | AI-generated trading signals |
| `trades` | Executed trade records |
| `trade_executions` | Detailed execution logs |
| `backtest_results` | Strategy backtesting results |
| `chat_messages` | AI conversation history |
| `indicator_cache` | Cached technical indicator calculations |

---

## 🔧 Configuration

### Trading Bot Settings

Edit `server/services/tradingBot.ts` to customize:

```typescript
const config = {
  checkInterval: 60000, // Check market every 60 seconds
  rsiOverbought: 70,    // RSI overbought threshold
  rsiOversold: 30,      // RSI oversold threshold
  maxDailyTrades: 10,   // Maximum trades per day
  maxDailyLoss: 0.05,   // Stop if daily loss exceeds 5%
  positionSize: 0.02,   // Use 2% of capital per trade
};
```

### Risk Management

Adjust risk parameters in `server/analysis/riskManagement.ts`:

```typescript
const riskParams = {
  maxRiskPerTrade: 0.02,     // Risk 2% per trade
  stopLossPercent: 0.02,     // 2% stop loss
  takeProfitPercent: 0.04,   // 4% take profit (1:2 R:R)
  maxOpenPositions: 3,       // Maximum 3 concurrent positions
};
```

---

## 🧪 Testing

### Run Technical Indicator Calculations

```bash
python3 server/python/calculate_indicators.py
```

### Test OKX Connection

```typescript
import { createOKXInstance } from './server/services/okxService';

const okx = await createOKXInstance(apiKey, secretKey, password);
const ticker = await okx.fetchTicker('BTC/USDT');
console.log(ticker);
```

---

## ⚠️ Risk Disclaimer

**IMPORTANT**: This is an experimental trading bot for educational purposes.

- Cryptocurrency trading involves substantial risk of loss
- Past performance does not guarantee future results
- Never invest more than you can afford to lose
- Always test strategies with small amounts first
- The AI's recommendations are not financial advice
- Use at your own risk

---

## 📈 Roadmap

- [ ] Backtesting engine with historical data (6+ months)
- [ ] Interactive candlestick charts with `lightweight-charts`
- [ ] Telegram notifications for trade alerts
- [ ] Multi-exchange support (Binance, Bybit)
- [ ] Portfolio rebalancing strategies
- [ ] Machine learning model training on historical data

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Llama LLM** for intelligent market analysis
- **ccxt** library for exchange connectivity
- **TA-Lib** for technical indicator calculations
- **Manus Platform** for deployment infrastructure
- **OKX** for providing trading API

---

## 📞 Support

For questions or issues:
- Open an issue on GitHub
- Contact: [Your Email]
- Documentation: [Your Docs URL]

---

**Built with ❤️ by Manus AI**
