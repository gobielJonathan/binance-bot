# API Key Management Guide

## Important: Testnet vs Live API Keys

**🔑 Key Fact: You need DIFFERENT API keys for testnet and live trading.**

### Why Separate Keys?

Binance testnet and live trading use:
- ✅ Different authentication systems
- ✅ Different API endpoints
- ✅ Different databases
- ✅ Complete isolation for security

**A testnet key will NOT work on live Binance, and vice versa.**

## Getting Testnet API Keys

### 1. Visit Binance Testnet
Go to: https://testnet.binance.vision/

### 2. Generate Keys
- Click "Generate HMAC_SHA256 Key"
- Save your API Key and Secret Key
- These are FREE and use fake money

### 3. What You Get
```
Testnet API Key: MXT6HvjOm7qPVLLVCw8yKN...
Testnet Secret: kH8pAj2mNk2mLp3nFo4gPz...
```

### 4. Add to .env
```env
BINANCE_TESTNET=true
BINANCE_API_KEY=MXT6HvjOm7qPVLLVCw8yKN...
BINANCE_API_SECRET=kH8pAj2mNk2mLp3nFo4gPz...
```

## Getting Live API Keys

### 1. Visit Binance.com
Go to: https://www.binance.com/en/my/settings/api-management

**Prerequisites:**
- Verified Binance account
- 2FA enabled
- KYC completed

### 2. Create API Key
1. Click "Create API"
2. Label: "Arbitrage Bot"
3. Complete 2FA verification
4. **Save the Secret Key** (shown only once!)

### 3. Configure Restrictions (CRITICAL)
```
✅ Enable Reading
✅ Enable Spot & Margin Trading
❌ DISABLE Enable Withdrawals (IMPORTANT!)
❌ DISABLE Enable Futures
❌ DISABLE Enable Internal Transfer
```

**Why disable withdrawals?**
- If your API key is compromised, attackers cannot withdraw funds
- They can only trade, not steal
- This is your primary security measure

### 4. IP Whitelist (Recommended)
- Add your server's IP address
- Prevents API key use from other locations
- Extra security layer

### 5. What You Get
```
Live API Key: abc123xyz789different...
Live Secret: def456uvw012alsodifferent...
```

### 6. Add to .env
```env
# Comment out or remove testnet keys
# BINANCE_TESTNET=true
# BINANCE_API_KEY=testnet_key...

# Add live keys
BINANCE_TESTNET=false
BINANCE_API_KEY=abc123xyz789different...
BINANCE_API_SECRET=def456uvw012alsodifferent...
```

## Managing Both Keys

### Option 1: Single .env File (Switch Manually)
```env
# For TESTNET - Uncomment these:
# BINANCE_TESTNET=true
# BINANCE_API_KEY=testnet_key_here
# BINANCE_API_SECRET=testnet_secret_here

# For LIVE - Uncomment these:
BINANCE_TESTNET=false
BINANCE_API_KEY=live_key_here
BINANCE_API_SECRET=live_secret_here
```

### Option 2: Separate .env Files (Recommended)

Create two files:

**.env.testnet:**
```env
BINANCE_TESTNET=true
BINANCE_API_KEY=testnet_key_here
BINANCE_API_SECRET=testnet_secret_here
MIN_SPREAD_PERCENT=0.03
MAX_POSITION_PERCENT=10
```

**.env.live:**
```env
BINANCE_TESTNET=false
BINANCE_API_KEY=live_key_here
BINANCE_API_SECRET=live_secret_here
MIN_SPREAD_PERCENT=0.05
MAX_POSITION_PERCENT=2
```

**Switch between them:**
```bash
# Use testnet
cp .env.testnet .env
npm run dev

# Use live (after testing!)
cp .env.live .env
npm run dev
```

## Security Best Practices

### 1. Never Commit Keys to Git
✅ `.env` is in `.gitignore`
✅ `.env.testnet` should be added too
✅ `.env.live` should be added too
❌ Never push keys to GitHub

### 2. Rotate Keys Regularly
- Change API keys every 3-6 months
- Immediately if you suspect compromise
- Delete old keys after rotation

### 3. Restrict Permissions
- ✅ Only enable what you need
- ❌ Never enable withdrawals
- ✅ Use IP whitelist when possible

### 4. Monitor API Key Activity
- Check Binance API logs regularly
- Watch for unexpected API calls
- Revoke immediately if suspicious

### 5. Store Securely
- Don't share keys via email or chat
- Use password manager for storage
- Keep backup in secure location

## Troubleshooting

### "Invalid API Key" Error

**If using testnet:**
- Verify key is from https://testnet.binance.vision/
- Check `BINANCE_TESTNET=true` in .env
- Regenerate if key is old

**If using live:**
- Verify key is from https://www.binance.com
- Check `BINANCE_TESTNET=false` in .env
- Ensure key has correct permissions
- Check IP whitelist if enabled

### "API Key Permissions Error"

For live keys, ensure:
- ✅ "Enable Reading" is ON
- ✅ "Enable Spot & Margin Trading" is ON
- ❌ "Enable Withdrawals" is OFF

### Key Works on Website But Not in Bot

**Common causes:**
1. Using testnet key with `BINANCE_TESTNET=false`
2. Using live key with `BINANCE_TESTNET=true`
3. IP not whitelisted
4. Missing permissions

**Solution:**
```bash
# Check your .env file
cat .env | grep BINANCE

# Make sure mode matches your keys
# Testnet keys → BINANCE_TESTNET=true
# Live keys → BINANCE_TESTNET=false
```

## Quick Reference

| Aspect | Testnet | Live |
|--------|---------|------|
| **Source** | testnet.binance.vision | binance.com |
| **Money** | Fake (free) | Real (yours) |
| **API Key Format** | Usually starts with "MXT" | Varies |
| **Registration** | Free, no KYC | Requires verified account |
| **Risk** | Zero | High |
| **Permissions** | All enabled by default | Must configure carefully |
| **IP Whitelist** | Optional | Strongly recommended |
| **Withdrawals** | N/A (fake money) | MUST be disabled |
| **.env Setting** | `BINANCE_TESTNET=true` | `BINANCE_TESTNET=false` |

## Key Takeaways

1. ❌ **One key cannot work for both** testnet and live
2. ✅ **Always test on testnet first** with testnet keys
3. ✅ **Get live keys only when ready** to trade real money
4. ✅ **Disable withdrawals** on live API keys
5. ✅ **Use IP whitelist** for live keys
6. ✅ **Never share or commit** your API keys
7. ✅ **Switch keys in .env** when changing modes
8. ✅ **Double-check mode** matches your keys

## Need Help?

- Testnet keys: https://testnet.binance.vision/ (no support needed)
- Live keys: https://www.binance.com/en/support
- Bot issues: Check logs in `logs/error.log`
