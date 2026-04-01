# Binance Arbitrage Trading Bot

A TypeScript/Node.js trading bot that executes triangular arbitrage opportunities on Binance to generate consistent small profits with minimal risk.

## 🎯 Features

- **Triangular Arbitrage**: Automatically detects and executes arbitrage opportunities across three trading pairs (e.g., BTC/USDT → ETH/BTC → ETH/USDT)
- **Real-time Market Data**: WebSocket connections for live price feeds
- **Conservative Risk Management**:
  - Position sizing (max 5% per trade)
  - Circuit breaker on consecutive losses
  - Slippage protection
  - Liquidity filtering
- **Testnet Support**: Safe development and testing on Binance Testnet
- **Performance Tracking**: SQLite database for trade history and metrics
- **Professional Logging**: Winston logger with file rotation

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Binance account with API keys (testnet or live)

## 🚀 Quick Start

### 1. Installation

```bash
npm install
```

### 2. Configuration

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` and add your Binance API credentials:
```env
# FOR TESTNET (Safe Testing - Recommended)
BINANCE_TESTNET=true
BINANCE_API_KEY=your_testnet_api_key_here
BINANCE_API_SECRET=your_testnet_api_secret_here

# FOR LIVE TRADING (Real Money - See LIVE_TRADING.md first!)
# BINANCE_TESTNET=false
# BINANCE_API_KEY=your_live_api_key_here
# BINANCE_API_SECRET=your_live_api_secret_here
```

### 3. Get API Keys

**For Testnet (Recommended First):**
1. Visit [Binance Testnet](https://testnet.binance.vision/)
2. Create an account
3. Generate API keys
4. Add keys to your `.env` file

**For Live Trading:**
⚠️ **READ [LIVE_TRADING.md](LIVE_TRADING.md) FIRST!**
- Only after successful testnet validation
- Start with minimal capital ($50-100 max)
- Understand all risks involved

### 4. Run the Bot

Development mode with auto-reload:
```bash
npm run dev
```

Production mode:
```bash
npm run build
npm start
```

## 📁 Project Structure

```
src/
├── config/           # Configuration management
├── models/           # TypeScript interfaces
├── services/
│   ├── market/      # Market data services
│   │   ├── websocket.ts
│   │   ├── price-aggregator.ts
│   │   ├── triangle-scanner.ts
│   │   ├── opportunity-detector.ts
│   │   └── liquidity-filter.ts
│   ├── trading/     # Trading execution
│   │   ├── order-executor.ts
│   │   ├── balance-manager.ts
│   │   ├── fee-calculator.ts
│   │   └── triangle-executor.ts
│   ├── binance.ts   # Binance API client
│   └── database.ts  # SQLite database
├── utils/           # Utilities (logger, etc.)
└── index.ts         # Main application
```

## ⚙️ Configuration

All configuration is managed through environment variables in `.env`:

| Variable | Description | Default | Live Recommendation |
|----------|-------------|---------|---------------------|
| `BINANCE_TESTNET` | Use testnet (true) or live (false) | `true` | `false` (after testing) |
| `BINANCE_API_KEY` | Your Binance API key | - | Live API key |
| `BINANCE_API_SECRET` | Your Binance API secret | - | Live secret |
| `MIN_SPREAD_PERCENT` | Minimum profit threshold | `0.03` | `0.05` (more conservative) |
| `MIN_LIQUIDITY_24H` | Minimum 24h volume (USDT) | `1000000` | `5000000` (higher) |
| `MAX_POSITION_PERCENT` | Max position size (% of capital) | `5` | `2` (lower risk) |
| `MAX_CONCURRENT_TRADES` | Max simultaneous trades | `3` | `1` (safer) |
| `CONSECUTIVE_LOSS_LIMIT` | Circuit breaker threshold | `3` | `3` |

**For Live Trading:** See [LIVE_TRADING.md](LIVE_TRADING.md) for detailed configuration guide.

### Triangle Configuration

Edit `src/config/index.ts` to customize trading pairs:

```typescript
const defaultTriangles: Triangle[] = [
  {
    name: 'BTC-ETH-USDT',
    pairs: ['BTCUSDT', 'ETHBTC', 'ETHUSDT'],
  },
  {
    name: 'BNB-BTC-USDT',
    pairs: ['BNBUSDT', 'BTCBNB', 'BTCUSDT'],
  },
  // Add more triangles here
];
```

## 🛡️ Risk Management

The bot implements multiple layers of protection:

1. **Position Sizing**: Never risks more than 5% of capital per trade
2. **Liquidity Filter**: Only trades pairs with >$1M daily volume
3. **Slippage Protection**: Validates prices before each leg
4. **Circuit Breaker**: Pauses after 3 consecutive losses
5. **Fee Awareness**: Calculates net profit after 0.3% fees (3 × 0.1%)

## 📊 How Triangular Arbitrage Works

Example with BTC/USDT → ETH/BTC → ETH/USDT:

1. **Leg 1**: Buy ETH with USDT (ETHUSDT)
2. **Leg 2**: Sell ETH for BTC (ETHBTC)  
3. **Leg 3**: Sell BTC for USDT (BTCUSDT)

If the exchange rates create a profitable loop after fees, the bot executes all three trades automatically.

## 💰 Profitability

- **Target**: 0.03% net profit per triangle minimum
- **Fees**: 0.1% per trade × 3 trades = 0.3% total
- **Example**: $1000 trade with 0.05% spread = $0.50 profit
- **Reality Check**: Opportunities are rare and highly competitive

## ⚠️ Important Warnings

### For Testnet (Safe Testing)
1. **Start with Testnet**: Always test thoroughly before using real funds
2. **Learn the Bot**: Understand how it works and behaves
3. **Test for 7+ Days**: Let it run and execute trades successfully
4. **Review Logs**: Make sure you understand all bot actions

### For Live Trading (Real Money)
⚠️ **READ [LIVE_TRADING.md](LIVE_TRADING.md) BEFORE ENABLING LIVE MODE!**

1. **High Risk**: Trading involves substantial risk of loss
2. **Start Small**: Begin with <$100 maximum
3. **Monitor Closely**: Check the bot regularly
4. **Accept Losses**: Only trade what you can afford to lose
5. **No Guarantees**: Past performance ≠ future results
6. **Competitive**: Many bots compete for same arbitrage
7. **Execution Risk**: Prices move between trade legs

**Never trade more than you can afford to lose!**

## 🧪 Development

Run tests:
```bash
npm test
```

Lint code:
```bash
npm run lint
```

Format code:
```bash
npm run format
```

Build for production:
```bash
npm run build
```

## 📝 Logs

Logs are stored in the `logs/` directory:
- `combined.log`: All log messages
- `error.log`: Error messages only

## 🗄️ Database

Trade history and metrics are stored in `data/trading.db` (SQLite).

Tables:
- `trades`: Complete trade history with all legs
- `opportunities`: All detected opportunities
- `performance_metrics`: Performance statistics

## 🔧 Troubleshooting

### API Connection Issues
```bash
# Test your API connection
node -e "require('./dist/services/binance').default.testConnection()"
```

### WebSocket Issues
- Check firewall settings
- Ensure stable internet connection
- Verify testnet URLs are correct

### Missing Dependencies
```bash
rm -rf node_modules package-lock.json
npm install
```

## 📈 Next Steps

After successful testnet testing:

1. Switch to live mode: `BINANCE_TESTNET=false`
2. Add real API keys
3. Start with minimal capital ($50-100)
4. Monitor for 24-48 hours
5. Gradually scale if profitable

## 📜 License

ISC

## ⚖️ Disclaimer

This software is for educational purposes only. Trading cryptocurrencies involves substantial risk of loss. The authors are not responsible for any financial losses incurred through the use of this software. Always do your own research and never invest more than you can afford to lose.

