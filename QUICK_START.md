# Quick Start Guide - Binance Arbitrage Bot

## Prerequisites Checklist

- [ ] Node.js 18+ installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] Git installed (optional)
- [ ] Text editor (VS Code recommended)

## Step-by-Step Setup (5 minutes)

### 1. Navigate to Project
```bash
cd /Users/gobielj/Documents/code/learning/binance-bot
```

### 2. Verify Installation
Dependencies are already installed. Verify with:
```bash
npm list --depth=0
```

You should see:
- binance-api-node
- express
- socket.io
- sqlite3
- winston
- typescript
- etc.

### 3. Get Binance Testnet API Keys

**Option A: Binance Spot Testnet**
1. Go to https://testnet.binance.vision/
2. Click "Generate HMAC_SHA256 Key"
3. Save your API Key and Secret Key

**Option B: Create Account**
1. Visit https://testnet.binance.vision/
2. Login with GitHub
3. Go to API Keys section
4. Create new key pair

### 4. Configure Environment

Copy the example file:
```bash
cp .env.example .env
```

Edit `.env` with your API keys:
```bash
# Use nano, vim, or VS Code
nano .env
```

Paste your keys:
```env
BINANCE_TESTNET=true
BINANCE_API_KEY=your_api_key_from_testnet
BINANCE_API_SECRET=your_secret_key_from_testnet

MIN_SPREAD_PERCENT=0.03
MIN_LIQUIDITY_24H=1000000
MAX_POSITION_PERCENT=5
```

Save and exit (Ctrl+X, then Y, then Enter in nano)

### 5. Build the Project
```bash
npm run build
```

Expected output: No errors, `dist/` folder created

### 6. Run the Bot!

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

## What You Should See

When the bot starts successfully:
```
2026-04-01 10:00:00 [info]: Initializing trading bot...
2026-04-01 10:00:00 [info]: Binance service initialized { testnet: true }
2026-04-01 10:00:00 [info]: Connected to SQLite database { path: 'data/trading.db' }
2026-04-01 10:00:00 [info]: WebSocket client initialized
2026-04-01 10:00:00 [info]: Triangle scanner initialized
2026-04-01 10:00:00 [info]: Valid triangle found { name: 'BTC-ETH-USDT', legs: [...] }
2026-04-01 10:00:01 [info]: Binance connection test successful
2026-04-01 10:00:01 [info]: Account balance { USDT: '10000.00' }
2026-04-01 10:00:01 [info]: Subscribing to market data { pairs: 9 }
2026-04-01 10:00:02 [info]: ✅ Trading bot started successfully
2026-04-01 10:00:02 [info]: Bot is monitoring for arbitrage opportunities...
```

### If You See Errors

**"Failed to connect to Binance"**
- Check your API keys in `.env`
- Verify testnet is accessible
- Check internet connection

**"BINANCE_API_KEY not configured"**
- Make sure `.env` file exists
- Check API keys are set correctly
- No quotes around keys needed

**"Module not found"**
- Run `npm install` again
- Check Node.js version (needs 18+)

## Monitoring the Bot

### Console Output
Watch the console for:
- Price updates
- Opportunity detections (🚀 symbol)
- Trade executions (✅ or ❌)

### Log Files
Check detailed logs:
```bash
tail -f logs/combined.log
```

Error logs only:
```bash
tail -f logs/error.log
```

### Database
View trade history:
```bash
sqlite3 data/trading.db "SELECT * FROM trades ORDER BY created_at DESC LIMIT 10;"
```

View opportunities:
```bash
sqlite3 data/trading.db "SELECT triangle_name, spread_percent, created_at FROM opportunities ORDER BY created_at DESC LIMIT 20;"
```

## Testing the Bot

### 1. Verify Connection
The bot should log "Binance connection test successful"

### 2. Check Balance
Should display your testnet USDT balance (usually 10,000 USDT on new testnet accounts)

### 3. Monitor Opportunities
Watch console for "Opportunity detected!" messages

### 4. Wait for Execution
When a profitable opportunity appears, bot will:
1. Check liquidity
2. Execute leg 1
3. Execute leg 2
4. Execute leg 3
5. Log final profit

## Expected Behavior

### Normal Operation:
```
[info]: Opportunity detected! { triangle: 'BTC-ETH-USDT', spread: '0.0421', netProfit: '0.0421' }
[info]: 🚀 Executing profitable opportunity!
[info]: Starting triangle execution
[info]: Executing leg 1 { pair: 'BTCUSDT', side: 'BUY', amount: 500 }
[info]: Market buy order placed { orderId: 12345, executedQty: '0.01234' }
[info]: Executing leg 2 ...
[info]: Executing leg 3 ...
[info]: ✅ Trade completed successfully { profit: '0.2105', profitPercent: '0.0421' }
```

### Low Liquidity (Skipped):
```
[info]: Opportunity detected!
[debug]: Skipping opportunity - insufficient liquidity { failedPairs: 'ETHBNB' }
```

### No Opportunities:
```
[info]: Bot is monitoring for arbitrage opportunities...
(silence is normal - opportunities are rare)
```

## Stopping the Bot

Press **Ctrl+C** to stop gracefully:
```
^C
[info]: Received SIGINT, shutting down gracefully...
[info]: Stopping trading bot...
[info]: Database connection closed
[info]: Trading bot stopped
```

## Troubleshooting

### Bot stops immediately
- Check for error in logs: `cat logs/error.log`
- Verify API keys are correct
- Ensure internet connectivity

### No opportunities detected
- This is NORMAL - arbitrage is rare
- Try adjusting MIN_SPREAD_PERCENT to 0.01 for testing
- Check if pairs have enough liquidity

### Orders failing
- Verify testnet account has balance
- Check order size isn't too small
- Review error messages in logs

## Next Steps

Once running successfully:

1. **Monitor for 1 hour**: Let it detect opportunities
2. **Check database**: Review detected opportunities
3. **Analyze logs**: Understand the patterns
4. **Adjust parameters**: Tune MIN_SPREAD_PERCENT if needed
5. **Test execution**: Wait for actual trade execution

## Getting Testnet Funds

If your testnet account has no balance:
1. Visit testnet faucet (if available)
2. Or create new testnet account
3. Testnet accounts usually start with 10,000 USDT

## Safety Reminders

✅ You're on TESTNET - no real money at risk
✅ Practice and learn without financial risk
✅ Test all features before considering live trading
⚠️ NEVER use live API keys while learning

## Getting Help

If stuck:
1. Check logs/error.log for errors
2. Review README.md for detailed docs
3. Verify environment variables in .env
4. Ensure all dependencies installed: `npm install`
5. Try rebuilding: `npm run build`

## Success Criteria

You're ready to proceed when:
- [x] Bot starts without errors
- [x] Connects to Binance testnet
- [x] Shows your account balance
- [x] Monitors markets in real-time
- [x] Logs opportunities to console
- [x] Can run for 1+ hour continuously

---

**You're all set! The bot is now running and monitoring for arbitrage opportunities.** 🎉

Happy trading (on testnet)!
