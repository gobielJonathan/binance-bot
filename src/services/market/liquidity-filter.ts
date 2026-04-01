import BinanceService from '../binance';
import config from '../../config';
import logger from '../../utils/logger';

export interface LiquidityInfo {
  symbol: string;
  volume24h: number;
  volumeUSDT: number;
  bidDepth: number;
  askDepth: number;
  meetsRequirements: boolean;
}

class LiquidityFilter {
  private binanceService: BinanceService;
  private liquidityCache: Map<string, LiquidityInfo> = new Map();
  private cacheExpiryMs: number = 300000;

  constructor(binanceService: BinanceService) {
    this.binanceService = binanceService;
    logger.info('Liquidity filter initialized', {
      minLiquidity: config.strategy.minLiquidity24h,
    });
  }

  async checkLiquidity(symbol: string): Promise<LiquidityInfo> {
    const cached = this.liquidityCache.get(symbol);
    if (cached && Date.now() - (cached as any).timestamp < this.cacheExpiryMs) {
      return cached;
    }

    try {
      const stats = await this.binanceService.get24hrStats(symbol);
      const orderBook = await this.binanceService.getOrderBook(symbol, 20);

      const volume24h = parseFloat((stats as any).volume || '0');
      const volumeUSDT = parseFloat((stats as any).quoteVolume || '0');

      const bidDepth = orderBook.bids
        .slice(0, 10)
        .reduce((sum: number, [, qty]: [string, string]) => sum + parseFloat(qty), 0);
      const askDepth = orderBook.asks
        .slice(0, 10)
        .reduce((sum: number, [, qty]: [string, string]) => sum + parseFloat(qty), 0);

      const meetsRequirements = volumeUSDT >= config.strategy.minLiquidity24h;

      const liquidityInfo: LiquidityInfo = {
        symbol,
        volume24h,
        volumeUSDT,
        bidDepth,
        askDepth,
        meetsRequirements,
      };

      (liquidityInfo as any).timestamp = Date.now();
      this.liquidityCache.set(symbol, liquidityInfo);

      logger.debug('Liquidity checked', {
        symbol,
        volumeUSDT: volumeUSDT.toFixed(0),
        meetsRequirements,
      });

      return liquidityInfo;
    } catch (error) {
      logger.error('Failed to check liquidity', { symbol, error });
      throw error;
    }
  }

  async checkTriangleLiquidity(pairs: string[]): Promise<boolean> {
    try {
      const checks = await Promise.all(pairs.map((pair) => this.checkLiquidity(pair)));

      const allMeetRequirements = checks.every((check) => check.meetsRequirements);

      if (!allMeetRequirements) {
        const failedPairs = checks
          .filter((c) => !c.meetsRequirements)
          .map((c) => c.symbol)
          .join(', ');
        logger.debug('Triangle liquidity check failed', { failedPairs });
      }

      return allMeetRequirements;
    } catch (error) {
      logger.error('Failed to check triangle liquidity', { pairs, error });
      return false;
    }
  }

  async filterLiquidPairs(pairs: string[]): Promise<string[]> {
    const liquidPairs: string[] = [];

    for (const pair of pairs) {
      try {
        const info = await this.checkLiquidity(pair);
        if (info.meetsRequirements) {
          liquidPairs.push(pair);
        }
      } catch (error) {
        logger.warn('Skipping pair due to liquidity check error', { pair });
      }
    }

    return liquidPairs;
  }

  clearCache(): void {
    this.liquidityCache.clear();
    logger.info('Liquidity cache cleared');
  }

  getCacheSize(): number {
    return this.liquidityCache.size;
  }
}

export default LiquidityFilter;
