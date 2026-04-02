import Binance from 'binance-api-node';
import config from '../config';
import logger from '../utils/logger';

export interface Balance {
  asset: string;
  free: string;
  locked: string;
}

export interface LotSizeFilter {
  minQty: number;
  maxQty: number;
  stepSize: number;
  stepDecimals: number;
}

export interface OrderResult {
  symbol: string;
  orderId: number;
  status: string;
  executedQty: string;
  cummulativeQuoteQty: string;
  price: string;
  side: string;
  type: string;
}

type BinanceClient = ReturnType<typeof Binance>;

class BinanceService {
  private client: BinanceClient;
  private isTestnet: boolean;
  private lotSizeCache: Map<string, LotSizeFilter> = new Map();

  constructor() {
    this.isTestnet = config.exchange.testnet;

    if (!config.exchange.apiKey || !config.exchange.apiSecret) {
      throw new Error('Binance API credentials not configured');
    }

    this.client = Binance({
      apiKey: config.exchange.apiKey,
      apiSecret: config.exchange.apiSecret,
      httpBase: this.isTestnet ? 'https://testnet.binance.vision' : 'https://api.binance.com',

      wsBase: this.isTestnet
        ? 'wss://stream.testnet.binance.vision/ws'
        : 'wss://stream.binance.com:9443/ws',
    });

    logger.info('Binance service initialized', {
      testnet: this.isTestnet,
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.client.ping();
      logger.info('Binance connection test successful');
      return true;
    } catch (error) {
      logger.error('Binance connection test failed', { error });
      return false;
    }
  }

  async getAccountInfo() {
    try {
      const accountInfo = await this.client.accountInfo();
      logger.debug('Retrieved account info', {
        canTrade: accountInfo.canTrade,
        balances: accountInfo.balances.filter((b: Balance) => parseFloat(b.free) > 0).length,
      });
      return accountInfo;
    } catch (error) {
      logger.error('Failed to get account info', { error });
      throw error;
    }
  }

  async getBalance(asset: string): Promise<Balance | null> {
    try {
      const accountInfo = await this.client.accountInfo();
      const balance = accountInfo.balances.find((b: Balance) => b.asset === asset);
      return balance || null;
    } catch (error) {
      logger.error('Failed to get balance', { asset, error });
      throw error;
    }
  }

  async getAllBalances(): Promise<Balance[]> {
    try {
      const accountInfo = await this.client.accountInfo();
      return accountInfo.balances.filter(
        (b: Balance) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0
      );
    } catch (error) {
      logger.error('Failed to get all balances', { error });
      throw error;
    }
  }

  async getExchangeInfo() {
    try {
      const info = await this.client.exchangeInfo();
      return info;
    } catch (error) {
      logger.error('Failed to get exchange info', { error });
      throw error;
    }
  }

  async getLotSizeFilter(symbol: string): Promise<LotSizeFilter> {
    const cached = this.lotSizeCache.get(symbol);
    if (cached) return cached;

    const info = await this.getExchangeInfo();
    const symbolInfo = (info.symbols as any[]).find((s: any) => s.symbol === symbol);
    if (!symbolInfo) throw new Error(`Symbol ${symbol} not found in exchange info`);

    const lotFilter = symbolInfo.filters.find((f: any) => f.filterType === 'LOT_SIZE');
    if (!lotFilter) throw new Error(`LOT_SIZE filter not found for ${symbol}`);

    const stepSize = parseFloat(lotFilter.stepSize);
    const stepDecimals = (lotFilter.stepSize as string).replace(/0+$/, '').split('.')[1]?.length ?? 0;

    const filter: LotSizeFilter = {
      minQty: parseFloat(lotFilter.minQty),
      maxQty: parseFloat(lotFilter.maxQty),
      stepSize,
      stepDecimals,
    };

    this.lotSizeCache.set(symbol, filter);
    return filter;
  }

  async get24hrStats(symbol: string) {
    try {
      const stats = await this.client.dailyStats({ symbol });
      return stats;
    } catch (error) {
      logger.error('Failed to get 24hr stats', { symbol, error });
      throw error;
    }
  }

  async getOrderBook(symbol: string, limit: number = 100) {
    try {
      const orderBook = await this.client.book({ symbol, limit });
      return orderBook;
    } catch (error) {
      logger.error('Failed to get order book', { symbol, error });
      throw error;
    }
  }

  async marketBuy(symbol: string, quantity: number): Promise<OrderResult> {
    try {
      logger.info('Placing market buy order', { symbol, quantity });
      const order = await this.client.order({
        symbol,
        side: 'BUY',
        type: 'MARKET',
        quantity: quantity.toString(),
      } as any);
      logger.info('Market buy order placed', {
        symbol,
        orderId: order.orderId,
        status: order.status,
        executedQty: order.executedQty,
      });
      return order as OrderResult;
    } catch (error) {
      logger.error('Failed to place market buy order', { symbol, quantity, error });
      throw error;
    }
  }

  async marketSell(symbol: string, quantity: number): Promise<OrderResult> {
    try {
      logger.info('Placing market sell order', { symbol, quantity });
      const order = await this.client.order({
        symbol,
        side: 'SELL',
        type: 'MARKET',
        quantity: quantity.toString(),
      } as any);
      logger.info('Market sell order placed', {
        symbol,
        orderId: order.orderId,
        status: order.status,
        executedQty: order.executedQty,
      });
      return order as OrderResult;
    } catch (error) {
      logger.error('Failed to place market sell order', { symbol, quantity, error });
      throw error;
    }
  }

  async getOrder(symbol: string, orderId: number) {
    try {
      const order = await this.client.getOrder({ symbol, orderId });
      return order;
    } catch (error) {
      logger.error('Failed to get order', { symbol, orderId, error });
      throw error;
    }
  }

  getClient(): BinanceClient {
    return this.client;
  }

  isTestnetMode(): boolean {
    return this.isTestnet;
  }
}

export default BinanceService;
