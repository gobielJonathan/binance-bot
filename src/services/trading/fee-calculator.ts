import config from '../../config';
import logger from '../../utils/logger';
import { OrderExecution } from './order-executor';

export interface FeeCalculation {
  leg1Fee: number;
  leg2Fee: number;
  leg3Fee: number;
  totalFees: number;
  totalFeesPercent: number;
  feeAsset: string;
}

export interface ProfitCalculation {
  startAmount: number;
  endAmount: number;
  grossProfit: number;
  grossProfitPercent: number;
  totalFees: number;
  netProfit: number;
  netProfitPercent: number;
}

class FeeCalculator {
  private baseFeePercent: number = 0.1;
  private bnbDiscountPercent: number = 25;

  constructor() {
    logger.info('Fee calculator initialized', {
      baseFeePercent: this.baseFeePercent,
      bnbDiscount: this.bnbDiscountPercent,
    });
  }

  calculateOrderFee(executedQty: number, price: number, useBNB: boolean = false): number {
    const orderValue = executedQty * price;
    const feePercent = useBNB
      ? this.baseFeePercent * (1 - this.bnbDiscountPercent / 100)
      : this.baseFeePercent;

    return (orderValue * feePercent) / 100;
  }

  calculateTriangleFees(
    leg1: OrderExecution,
    leg2: OrderExecution,
    leg3: OrderExecution,
    useBNB: boolean = false
  ): FeeCalculation {
    const leg1Fee = this.calculateOrderFee(leg1.executedQty, leg1.price, useBNB);
    const leg2Fee = this.calculateOrderFee(leg2.executedQty, leg2.price, useBNB);
    const leg3Fee = this.calculateOrderFee(leg3.executedQty, leg3.price, useBNB);

    const totalFees = leg1Fee + leg2Fee + leg3Fee;
    const totalFeesPercent = (this.baseFeePercent * 3);

    return {
      leg1Fee,
      leg2Fee,
      leg3Fee,
      totalFees,
      totalFeesPercent,
      feeAsset: useBNB ? 'BNB' : 'USDT',
    };
  }

  calculateProfit(
    startAmountUSDT: number,
    endAmountUSDT: number,
    fees: FeeCalculation
  ): ProfitCalculation {
    const grossProfit = endAmountUSDT - startAmountUSDT;
    const grossProfitPercent = (grossProfit / startAmountUSDT) * 100;

    const netProfit = grossProfit - fees.totalFees;
    const netProfitPercent = (netProfit / startAmountUSDT) * 100;

    return {
      startAmount: startAmountUSDT,
      endAmount: endAmountUSDT,
      grossProfit,
      grossProfitPercent,
      totalFees: fees.totalFees,
      netProfit,
      netProfitPercent,
    };
  }

  estimateTotalFees(startAmountUSDT: number): number {
    return (startAmountUSDT * this.baseFeePercent * 3) / 100;
  }

  getMinimumProfitableSpread(): number {
    return this.baseFeePercent * 3;
  }

  logFeeBreakdown(fees: FeeCalculation): void {
    logger.info('Fee breakdown', {
      leg1: fees.leg1Fee.toFixed(4),
      leg2: fees.leg2Fee.toFixed(4),
      leg3: fees.leg3Fee.toFixed(4),
      total: fees.totalFees.toFixed(4),
      totalPercent: fees.totalFeesPercent.toFixed(2),
    });
  }

  logProfitBreakdown(profit: ProfitCalculation): void {
    logger.info('Profit breakdown', {
      start: profit.startAmount.toFixed(2),
      end: profit.endAmount.toFixed(2),
      gross: profit.grossProfit.toFixed(4),
      grossPercent: profit.grossProfitPercent.toFixed(4),
      fees: profit.totalFees.toFixed(4),
      net: profit.netProfit.toFixed(4),
      netPercent: profit.netProfitPercent.toFixed(4),
    });
  }
}

export default FeeCalculator;
