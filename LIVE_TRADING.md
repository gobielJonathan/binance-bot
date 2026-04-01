# Live Trading Guide - PLEASE READ CAREFULLY

## ⚠️ CRITICAL WARNING

**LIVE TRADING USES REAL MONEY AND INVOLVES SUBSTANTIAL RISK OF LOSS**

- Never trade more than you can afford to lose
- Start with minimal capital ($50-100 maximum)
- Understand that past performance does not guarantee future results
- Arbitrage opportunities are rare and highly competitive
- You may lose money due to slippage, fees, or execution delays

## Prerequisites for Live Trading

### 1. Testnet Validation (REQUIRED)
You must successfully test on testnet BEFORE live trading:

- [ ] Bot runs without errors for 24+ hours on testnet
- [ ] Successfully executed at least 5 complete triangle trades
- [ ] All trades recorded correctly in database
- [ ] No unexpected crashes or errors
- [ ] Understand all logs and bot behavior

### 2. Risk Assessment
Answer these questions honestly:

- [ ] Can you afford to lose 100% of your trading capital?
- [ ] Do you understand how triangular arbitrage works?
- [ ] Have you read all the code and understand what it does?
- [ ] Do you have realistic profit expectations (<1% per trade)?
- [ ] Can you monitor the bot regularly?

### 3. Security Checklist
- [ ] API keys have IP whitelist enabled
- [ ] API keys have withdrawal disabled
- [ ] API keys only have spot trading permissions
- [ ] Using strong, unique API keys
- [ ] .env file is properly secured and gitignored

## Setting Up Live Trading

### Step 1: Create Binance Live API Keys

1. **Login to Binance**: https://www.binance.com
2. **Go to API Management**: Account → API Management
3. **Create API Key**:
   - Label: "Arbitrage Bot"
   - Click "Create API"
   - Complete 2FA verification
   - **SAVE YOUR SECRET KEY** (shown only once!)

4. **Configure Restrictions** (CRITICAL):
   ```
   ✅ Enable Reading
   ✅ Enable Spot & Margin Trading
   ❌ DISABLE Enable Withdrawals (IMPORTANT!)
   ❌ DISABLE Enable Futures
   ❌ DISABLE Enable Internal Transfer
   ```

5. **IP Whitelist** (Recommended):
   - Add your server's IP address
   - This prevents unauthorized access

### Step 2: Update Configuration

Edit your `.env` file:

```env
# Change testnet to false
BINANCE_TESTNET=false

# Add your LIVE API keys
BINANCE_API_KEY=your_live_api_key_here
BINANCE_API_SECRET=your_live_secret_key_here

# Conservative settings for live trading
MIN_SPREAD_PERCENT=0.05          # Higher threshold = safer
MIN_LIQUIDITY_24H=5000000        # Higher liquidity = less slippage
MAX_POSITION_PERCENT=2           # Lower percentage = less risk
MAX_CONCURRENT_TRADES=1          # One trade at a time
```

### Step 3: Fund Your Account

**Start SMALL:**
- First time: $50-100 USDT maximum
- After 1 week success: Can increase to $200-500
- Never more than you can afford to lose

**How to deposit:**
1. Buy USDT on Binance
2. Transfer to Spot Wallet
3. Verify balance: `npm run check`

### Step 4: Final Safety Check

Run the pre-flight check:
```bash
npm run check
```

Verify:
- ✅ Build successful
- ✅ .env configured
- ✅ BINANCE_TESTNET=false
- ✅ API keys valid

### Step 5: Start Live Trading

**First Run:**
```bash
# Start in development mode to see detailed logs
npm run dev
```

**Watch for:**
```
⚠️  WARNING: LIVE TRADING MODE ENABLED
🔴 You are using REAL FUNDS on the live Binance exchange
...
Account balance: { available: '100.00', total: '100.00', mode: 'LIVE' }
⚠️  LIVE TRADING MODE - Real funds at risk!
Max position per trade: { percent: '2%', maxUSDT: '2.00' }
```

## Monitoring Live Trading

### What to Watch

**Every 5 Minutes:**
- Check console for errors
- Verify trades are completing successfully
- Monitor account balance

**Every Hour:**
- Review trade history in database
- Check profitability
- Verify no unusual activity

**Daily:**
- Calculate net profit/loss
- Review logs for any warnings
- Ensure bot is running smoothly

### Access Trade History

```bash
# View recent trades
sqlite3 data/trading.db "SELECT * FROM trades ORDER BY created_at DESC LIMIT 10;"

# View today's P&L
sqlite3 data/trading.db "SELECT SUM(actual_profit_usdt) as total_profit FROM trades WHERE date(created_at) = date('now');"

# View successful trades
sqlite3 data/trading.db "SELECT COUNT(*) FROM trades WHERE status = 'completed';"
```

### Check Logs

```bash
# Real-time log monitoring
tail -f logs/combined.log

# Error logs only
tail -f logs/error.log

# Search for trades
grep "Trade completed" logs/combined.log
```

## Risk Management

### Position Sizing
```
Max Position = Account Balance × MAX_POSITION_PERCENT / 100

Example with $100 account and 2% setting:
Max Position = $100 × 2 / 100 = $2 per trade
```

### Expected Returns
**Realistic expectations:**
- Opportunities: 1-5 per day (maybe)
- Profit per trade: 0.03% - 0.15%
- Daily return: 0.1% - 0.5% (if lucky)
- Monthly return: 3% - 15% (optimistic)

**Reality check:**
- Many days may have ZERO profitable opportunities
- Slippage can eat into profits
- Fees reduce profitability
- Competition is fierce

### When to Stop

**Stop immediately if:**
- 3 consecutive losing trades
- Any single trade loses >1% of capital
- Unexpected errors or crashes
- API rate limiting errors
- Account balance drops significantly

**How to stop:**
1. Press Ctrl+C (graceful shutdown)
2. Bot completes current trade if running
3. Disconnects from WebSocket
4. Closes database

## Troubleshooting Live Trading

### "Insufficient balance" error
- Check USDT balance in Spot Wallet
- Reduce MAX_POSITION_PERCENT
- Ensure funds aren't locked in other orders

### "API key invalid" error
- Verify API keys in .env
- Check API permissions on Binance
- Ensure IP whitelist includes your IP

### Trades failing
- Check Binance status page
- Verify pairs are trading
- Check if sufficient liquidity
- Review error logs

### No opportunities detected
- This is NORMAL - arbitrage is rare
- Consider lowering MIN_SPREAD_PERCENT to 0.02% for testing
- Check that pairs have volume
- Monitor for at least 24 hours

## Scaling Up Safely

### Gradual Increase
Only increase capital if:
- ✅ Profitable for 7+ days
- ✅ No major errors
- ✅ >80% trade success rate
- ✅ Understand the bot's behavior

### Suggested Timeline
1. **Week 1**: $50-100 (learning phase)
2. **Week 2**: $200-300 (if profitable)
3. **Week 3**: $500-800 (if still profitable)
4. **Month 2**: Up to $1000-2000 (cautiously)
5. **Never**: Risk life savings or borrowed money

## Emergency Procedures

### How to Stop Trading Immediately
```bash
# In terminal where bot is running:
Ctrl + C

# Or kill the process:
ps aux | grep node
kill -9 <process_id>
```

### How to Cancel All Open Orders
```bash
# Login to Binance.com
# Go to: Trade → Spot → Open Orders
# Click "Cancel All"
```

### How to Withdraw Funds
```bash
# After stopping bot:
1. Login to Binance.com
2. Wallet → Spot Wallet
3. Withdraw USDT to safe wallet
```

## Support and Resources

### Binance Resources
- API Documentation: https://binance-docs.github.io/apidocs/spot/en/
- Status Page: https://www.binance.com/en/support/announcement
- Support: https://www.binance.com/en/chat

### Bot Resources
- Check logs: `logs/combined.log`
- Database: `data/trading.db`
- Configuration: `.env`

## Legal Disclaimer

This software is provided "as is" without warranty of any kind. Trading cryptocurrencies involves substantial risk of loss and is not suitable for every investor. The authors and contributors are not responsible for any financial losses incurred through the use of this software.

By using this software for live trading, you acknowledge that:
- You understand the risks involved
- You are solely responsible for your trading decisions
- You will not hold the authors liable for any losses
- You have tested thoroughly on testnet
- You are trading with money you can afford to lose

---

## Final Checklist Before Going Live

- [ ] Successfully tested on testnet for 7+ days
- [ ] Read and understood this entire guide
- [ ] API keys configured with proper restrictions
- [ ] Withdrawals DISABLED on API keys
- [ ] Starting with minimal capital (<$100)
- [ ] Conservative settings in .env
- [ ] Can monitor bot regularly
- [ ] Understand you may lose money
- [ ] Prepared to stop if things go wrong
- [ ] Accept full responsibility for results

**If you checked all boxes, you may proceed with EXTREME CAUTION.**

**If you haven't checked all boxes, DO NOT trade live yet.**

---

**Remember: The best way to not lose money is to not trade at all. Only proceed if you fully understand the risks and can afford the losses.**
