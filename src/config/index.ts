import dotenv from 'dotenv';
import { Config, Triangle } from './types';

dotenv.config();

const defaultTriangles: Triangle[] = [
  { name: 'BTC-ETH-USDT', pairs: ['BTCUSDT', 'ETHBTC', 'ETHUSDT'] },
  { name: 'BNB-BTC-USDT', pairs: ['BNBUSDT', 'BNBBTC', 'BTCUSDT'] },
  { name: 'BNB-ETH-USDT', pairs: ['BNBUSDT', 'BNBETH', 'ETHUSDT'] },
];

const config: Config = {
  exchange: {
    name: 'binance',
    testnet: process.env.BINANCE_TESTNET === 'true',
    apiKey: process.env.BINANCE_API_KEY || '',
    apiSecret: process.env.BINANCE_API_SECRET || '',
  },

  strategy: {
    minSpreadPercent: parseFloat(process.env.MIN_SPREAD_PERCENT || '0.01'), // lowered from 0.03
    minLiquidity24h: parseInt(process.env.MIN_LIQUIDITY_24H || '500000', 10), // lowered from 1000000
    maxPositionPercent: parseFloat(process.env.MAX_POSITION_PERCENT || '10'), // raised from 5
    triangles: defaultTriangles,
  },

  risk: {
    maxConcurrentTrades: parseInt(process.env.MAX_CONCURRENT_TRADES || '3', 10),
    stopLossPercent: parseFloat(process.env.STOP_LOSS_PERCENT || '1'),
    consecutiveLossLimit: parseInt(process.env.CONSECUTIVE_LOSS_LIMIT || '3', 10),
  },

  execution: {
    orderTimeoutMs: parseInt(process.env.ORDER_TIMEOUT_MS || '3000', 10), // lowered from 5000
    priceRefreshMs: parseInt(process.env.PRICE_REFRESH_MS || '50', 10), // lowered from 100
  },

  dashboard: {
    port: parseInt(process.env.DASHBOARD_PORT || '3000', 10),
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

export default config;
