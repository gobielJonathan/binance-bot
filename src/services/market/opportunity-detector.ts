import config from '../../config';
import logger from '../../utils/logger';
import PriceAggregator from './price-aggregator';
import TriangleScanner from './triangle-scanner';
import { ArbitrageOpportunity } from '../../models/opportunity';
import { TrianglePath } from '../../models/triangle';

class OpportunityDetector {
  private priceAggregator: PriceAggregator;
  private triangleScanner: TriangleScanner;
  private tradingFeePercent: number = 0.1;
  private opportunities: ArbitrageOpportunity[] = [];
  private opportunityCallbacks: Array<(opportunity: ArbitrageOpportunity) => void> = [];

  constructor(priceAggregator: PriceAggregator, triangleScanner: TriangleScanner) {
    this.priceAggregator = priceAggregator;
    this.triangleScanner = triangleScanner;

    priceAggregator.onPriceUpdate(() => {
      this.scanForOpportunities();
    });

    logger.info('Opportunity detector initialized', {
      minSpread: config.strategy.minSpreadPercent,
      feePercent: this.tradingFeePercent,
    });
  }

  private scanForOpportunities(): void {
    const triangles = this.triangleScanner.getTriangles();

    for (const triangle of triangles) {
      const opportunity = this.calculateOpportunity(triangle, 100);
      if (opportunity && opportunity.netProfitPercent >= config.strategy.minSpreadPercent) {
        this.opportunities.push(opportunity);

        logger.info('Opportunity detected!', {
          triangle: opportunity.triangleName,
          spread: opportunity.spreadPercent.toFixed(4),
          netProfit: opportunity.netProfitPercent.toFixed(4),
          estimatedProfit: opportunity.estimatedProfitUSDT.toFixed(2),
        });

        this.opportunityCallbacks.forEach((callback) => {
          try {
            callback(opportunity);
          } catch (error) {
            logger.error('Error in opportunity callback', { error });
          }
        });
      }
    }
  }

  calculateOpportunity(
    triangle: TrianglePath,
    startAmountUSDT: number
  ): ArbitrageOpportunity | null {
    const prices = triangle.pairs.map((pair) => this.priceAggregator.getPrice(pair));

    if (prices.some((p) => !p)) {
      return null;
    }

    if (prices.some((p) => !this.priceAggregator.isDataFresh(p!.symbol))) {
      return null;
    }

    let currentAmount = startAmountUSDT;
    const legs: ArbitrageOpportunity['leg1'][] = [];

    for (let i = 0; i < 3; i++) {
      const leg = triangle.legs[i];
      const price = prices[i]!;

      let executionPrice: number;
      let resultAmount: number;

      if (leg.side === 'BUY') {
        executionPrice = price.ask;
        resultAmount = currentAmount / executionPrice;
      } else {
        executionPrice = price.bid;
        resultAmount = currentAmount * executionPrice;
      }

      const feeMultiplier = 1 - this.tradingFeePercent / 100;
      resultAmount *= feeMultiplier;

      legs.push({
        pair: leg.pair,
        side: leg.side,
        price: executionPrice,
        amount: currentAmount,
      });

      currentAmount = resultAmount;
    }

    const finalAmount = currentAmount;
    const spreadPercent = ((finalAmount - startAmountUSDT) / startAmountUSDT) * 100;
    const netProfitPercent = spreadPercent;
    const estimatedProfitUSDT = finalAmount - startAmountUSDT;

    if (netProfitPercent < 0) {
      return null;
    }

    return {
      triangleName: triangle.name,
      spreadPercent,
      netProfitPercent,
      estimatedProfitUSDT,
      leg1: legs[0],
      leg2: legs[1],
      leg3: legs[2],
      timestamp: Date.now(),
    };
  }

  onOpportunity(callback: (opportunity: ArbitrageOpportunity) => void): void {
    this.opportunityCallbacks.push(callback);
  }

  getRecentOpportunities(limit: number = 10): ArbitrageOpportunity[] {
    return this.opportunities.slice(-limit);
  }

  clearOldOpportunities(maxAgeMs: number = 60000): void {
    const cutoff = Date.now() - maxAgeMs;
    const before = this.opportunities.length;
    this.opportunities = this.opportunities.filter((o) => o.timestamp > cutoff);
    const removed = before - this.opportunities.length;

    if (removed > 0) {
      logger.debug('Cleared old opportunities', { count: removed });
    }
  }

  getStats() {
    const recent = this.opportunities.filter((o) => Date.now() - o.timestamp < 3600000);
    const profitable = recent.filter((o) => o.netProfitPercent > 0);

    return {
      totalOpportunities: this.opportunities.length,
      recentHour: recent.length,
      profitableCount: profitable.length,
      avgProfit:
        profitable.length > 0
          ? profitable.reduce((sum, o) => sum + o.netProfitPercent, 0) / profitable.length
          : 0,
      bestProfit: profitable.length > 0 ? Math.max(...profitable.map((o) => o.netProfitPercent)) : 0,
    };
  }
}

export default OpportunityDetector;
