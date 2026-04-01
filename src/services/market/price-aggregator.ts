import logger from '../../utils/logger';
import { PriceData } from '../../models/market';

class PriceAggregator {
  private prices: Map<string, PriceData> = new Map();
  private updateCallbacks: Array<(symbol: string, price: PriceData) => void> = [];

  updatePrice(priceData: PriceData): void {
    this.prices.set(priceData.symbol, priceData);

    this.updateCallbacks.forEach((callback) => {
      try {
        callback(priceData.symbol, priceData);
      } catch (error) {
        logger.error('Error in price update callback', { error });
      }
    });
  }

  getPrice(symbol: string): PriceData | undefined {
    return this.prices.get(symbol);
  }

  getAllPrices(): Map<string, PriceData> {
    return new Map(this.prices);
  }

  hasPriceData(symbol: string): boolean {
    return this.prices.has(symbol);
  }

  getBidAskSpread(symbol: string): number | null {
    const price = this.prices.get(symbol);
    if (!price) {
      return null;
    }

    return ((price.ask - price.bid) / price.bid) * 100;
  }

  getMidPrice(symbol: string): number | null {
    const price = this.prices.get(symbol);
    if (!price) {
      return null;
    }

    return (price.bid + price.ask) / 2;
  }

  onPriceUpdate(callback: (symbol: string, price: PriceData) => void): void {
    this.updateCallbacks.push(callback);
  }

  isDataFresh(symbol: string, maxAgeMs: number = 5000): boolean {
    const price = this.prices.get(symbol);
    if (!price) {
      return false;
    }

    const age = Date.now() - price.timestamp;
    return age <= maxAgeMs;
  }

  getTrackedSymbols(): string[] {
    return Array.from(this.prices.keys());
  }

  clearOldData(maxAgeMs: number = 60000): void {
    const now = Date.now();
    let cleared = 0;

    for (const [symbol, price] of this.prices) {
      if (now - price.timestamp > maxAgeMs) {
        this.prices.delete(symbol);
        cleared++;
      }
    }

    if (cleared > 0) {
      logger.info('Cleared old price data', { count: cleared });
    }
  }

  getStats() {
    return {
      totalSymbols: this.prices.size,
      freshDataCount: Array.from(this.prices.values()).filter(
        (p) => Date.now() - p.timestamp < 5000
      ).length,
      oldestDataAge:
        this.prices.size > 0
          ? Math.max(...Array.from(this.prices.values()).map((p) => Date.now() - p.timestamp))
          : 0,
    };
  }
}

export default PriceAggregator;
