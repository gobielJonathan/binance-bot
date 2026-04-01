import Binance from 'binance-api-node';
import logger from '../../utils/logger';
import { PriceData } from '../../models/market';

export interface WebSocketCleanup {
  (): void;
}

type BinanceClient = ReturnType<typeof Binance>;

class WebSocketClient {
  private client: BinanceClient;
  private subscriptions: Map<string, WebSocketCleanup> = new Map();
  private priceUpdateCallbacks: Map<string, (price: PriceData) => void> = new Map();

  constructor(client: BinanceClient) {
    this.client = client;
    logger.info('WebSocket client initialized');
  }

  subscribeToTicker(symbol: string, callback: (price: PriceData) => void): void {
    if (this.subscriptions.has(symbol)) {
      logger.warn('Already subscribed to ticker', { symbol });
      return;
    }

    logger.info('Subscribing to ticker', { symbol });

    try {
      const cleanup = this.client.ws.ticker(symbol, (ticker: any) => {
        const priceData: PriceData = {
          symbol: ticker.symbol,
          bid: parseFloat(ticker.bestBid),
          ask: parseFloat(ticker.bestAsk),
          bidQty: parseFloat(ticker.bestBidQty),
          askQty: parseFloat(ticker.bestAskQty),
          timestamp: Date.now(),
        };

        callback(priceData);
      });

      this.subscriptions.set(symbol, cleanup);
      this.priceUpdateCallbacks.set(symbol, callback);

      logger.info('Successfully subscribed to ticker', { symbol });
    } catch (error) {
      logger.error('Failed to subscribe to ticker', { symbol, error });
      throw error;
    }
  }

  subscribeToMultipleTickers(symbols: string[], callback: (price: PriceData) => void): void {
    logger.info('Subscribing to multiple tickers', { count: symbols.length });

    for (const symbol of symbols) {
      this.subscribeToTicker(symbol, callback);
    }
  }

  unsubscribe(symbol: string): void {
    const cleanup = this.subscriptions.get(symbol);
    if (cleanup) {
      cleanup();
      this.subscriptions.delete(symbol);
      this.priceUpdateCallbacks.delete(symbol);
      logger.info('Unsubscribed from ticker', { symbol });
    }
  }

  unsubscribeAll(): void {
    logger.info('Unsubscribing from all tickers', { count: this.subscriptions.size });

    for (const [symbol, cleanup] of this.subscriptions) {
      cleanup();
      logger.debug('Unsubscribed', { symbol });
    }

    this.subscriptions.clear();
    this.priceUpdateCallbacks.clear();
  }

  getActiveSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  isSubscribed(symbol: string): boolean {
    return this.subscriptions.has(symbol);
  }
}

export default WebSocketClient;
