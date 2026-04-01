import config from '../../config';
import logger from '../../utils/logger';
import { TrianglePath, TradeLeg } from '../../models/triangle';

class TriangleScanner {
  private triangles: TrianglePath[] = [];

  constructor() {
    this.scanTriangles();
  }

  private parseSymbol(symbol: string): { base: string; quote: string } | null {
    const commonQuotes = ['USDT', 'BTC', 'ETH', 'BNB', 'BUSD'];

    for (const quote of commonQuotes) {
      if (symbol.endsWith(quote)) {
        const base = symbol.slice(0, -quote.length);
        if (base.length > 0) {
          return { base, quote };
        }
      }
    }

    return null;
  }

  private scanTriangles(): void {
    logger.info('Scanning configured triangles');

    for (const triangle of config.strategy.triangles) {
      try {
        const path = this.analyzeTriangle(triangle.name, triangle.pairs);
        if (path) {
          this.triangles.push(path);
          logger.info('Valid triangle found', {
            name: path.name,
            legs: path.legs.map((l) => `${l.side} ${l.pair}`),
          });
        }
      } catch (error) {
        logger.error('Failed to analyze triangle', {
          name: triangle.name,
          pairs: triangle.pairs,
          error,
        });
      }
    }

    logger.info('Triangle scanning complete', { count: this.triangles.length });
  }

  private analyzeTriangle(
    name: string,
    pairs: [string, string, string]
  ): TrianglePath | null {
    const [pair1, pair2, pair3] = pairs;

    const parsed1 = this.parseSymbol(pair1);
    const parsed2 = this.parseSymbol(pair2);
    const parsed3 = this.parseSymbol(pair3);

    if (!parsed1 || !parsed2 || !parsed3) {
      logger.warn('Failed to parse triangle symbols', { name, pairs });
      return null;
    }

    const startAsset = parsed1.base;
    const startQuote = parsed1.quote;

    let leg1: TradeLeg = {
      pair: pair1,
      side: 'BUY',
      baseAsset: parsed1.base,
      quoteAsset: parsed1.quote,
    };

    let currentAsset = startAsset;

    let leg2: TradeLeg;
    if (parsed2.base === currentAsset) {
      leg2 = {
        pair: pair2,
        side: 'SELL',
        baseAsset: parsed2.base,
        quoteAsset: parsed2.quote,
      };
      currentAsset = parsed2.quote;
    } else if (parsed2.quote === currentAsset) {
      leg2 = {
        pair: pair2,
        side: 'BUY',
        baseAsset: parsed2.base,
        quoteAsset: parsed2.quote,
      };
      currentAsset = parsed2.base;
    } else {
      logger.warn('Leg 2 does not connect to leg 1', { name, currentAsset, pair2 });
      return null;
    }

    let leg3: TradeLeg;
    if (parsed3.base === currentAsset && parsed3.quote === startQuote) {
      leg3 = {
        pair: pair3,
        side: 'SELL',
        baseAsset: parsed3.base,
        quoteAsset: parsed3.quote,
      };
    } else if (parsed3.quote === currentAsset && parsed3.base === startQuote) {
      leg3 = {
        pair: pair3,
        side: 'BUY',
        baseAsset: parsed3.base,
        quoteAsset: parsed3.quote,
      };
    } else {
      logger.warn('Leg 3 does not close the triangle', {
        name,
        currentAsset,
        startQuote,
        pair3,
      });
      return null;
    }

    return {
      name,
      pairs,
      legs: [leg1, leg2, leg3],
    };
  }

  getTriangles(): TrianglePath[] {
    return this.triangles;
  }

  getTriangleByName(name: string): TrianglePath | undefined {
    return this.triangles.find((t) => t.name === name);
  }

  getAllPairs(): string[] {
    const pairs = new Set<string>();
    for (const triangle of this.triangles) {
      triangle.pairs.forEach((pair) => pairs.add(pair));
    }
    return Array.from(pairs);
  }
}

export default TriangleScanner;
