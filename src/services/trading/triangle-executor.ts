import logger from '../../utils/logger';
import Database, { Trade } from '../database';
import OrderExecutor from './order-executor';
import BalanceManager from './balance-manager';
import FeeCalculator from './fee-calculator';
import { ArbitrageOpportunity } from '../../models/opportunity';
import { TrianglePath } from '../../models/triangle';
import config from '../../config';

export interface TriangleExecutionResult {
  success: boolean;
  tradeId?: number;
  profit?: number;
  profitPercent?: number;
  error?: string;
  partialFill?: boolean;
}

class TriangleExecutor {
  private orderExecutor: OrderExecutor;
  private balanceManager: BalanceManager;
  private feeCalculator: FeeCalculator;
  private database: Database;
  private isExecuting: boolean = false;

  constructor(
    orderExecutor: OrderExecutor,
    balanceManager: BalanceManager,
    feeCalculator: FeeCalculator,
    database: Database
  ) {
    this.orderExecutor = orderExecutor;
    this.balanceManager = balanceManager;
    this.feeCalculator = feeCalculator;
    this.database = database;

    logger.info('Triangle executor initialized');
  }

  async executeTriangle(
    opportunity: ArbitrageOpportunity,
    triangle: TrianglePath
  ): Promise<TriangleExecutionResult> {
    if (this.isExecuting) {
      logger.warn('Triangle execution already in progress');
      return { success: false, error: 'Execution in progress' };
    }

    this.isExecuting = true;

    try {
      logger.info('Starting triangle execution', {
        triangle: opportunity.triangleName,
        expectedProfit: opportunity.netProfitPercent.toFixed(4),
      });

      const usdtBalance = await this.balanceManager.getUSDTBalance();
      const maxPosition = (usdtBalance * config.strategy.maxPositionPercent) / 100;
      const startAmount = Math.min(opportunity.leg1.amount, maxPosition);

      if (startAmount < 10) {
        return { success: false, error: 'Insufficient balance' };
      }

      const trade: Trade = {
        triangle_name: opportunity.triangleName,
        leg1_pair: opportunity.leg1.pair,
        leg1_side: opportunity.leg1.side,
        leg1_amount: startAmount,
        leg1_price: opportunity.leg1.price,
        leg1_filled: 0,
        leg2_pair: opportunity.leg2.pair,
        leg2_side: opportunity.leg2.side,
        leg2_amount: 0,
        leg2_price: opportunity.leg2.price,
        leg2_filled: 0,
        leg3_pair: opportunity.leg3.pair,
        leg3_side: opportunity.leg3.side,
        leg3_amount: 0,
        leg3_price: opportunity.leg3.price,
        leg3_filled: 0,
        expected_profit_percent: opportunity.netProfitPercent,
        status: 'pending',
        created_at: new Date().toISOString(),
      };

      const tradeId = await this.database.insertTrade(trade);
      await this.database.updateTrade(tradeId, { status: 'in_progress' });

      try {
        logger.info('Executing leg 1', {
          pair: opportunity.leg1.pair,
          side: opportunity.leg1.side,
          amount: startAmount,
        });
        const leg1Result = await this.orderExecutor.executeOrder({
          symbol: opportunity.leg1.pair,
          side: opportunity.leg1.side,
          quantity: startAmount / opportunity.leg1.price,
        });

        await this.database.updateTrade(tradeId, {
          leg1_filled: leg1Result.executedQty,
        });

        const leg2Quantity = leg1Result.executedQty;
        logger.info('Executing leg 2', {
          pair: opportunity.leg2.pair,
          side: opportunity.leg2.side,
          quantity: leg2Quantity,
        });
        const leg2Result = await this.orderExecutor.executeOrder({
          symbol: opportunity.leg2.pair,
          side: opportunity.leg2.side,
          quantity: leg2Quantity,
        });

        await this.database.updateTrade(tradeId, {
          leg2_amount: leg2Quantity,
          leg2_filled: leg2Result.executedQty,
        });

        const leg3Quantity = leg2Result.executedQty;
        logger.info('Executing leg 3', {
          pair: opportunity.leg3.pair,
          side: opportunity.leg3.side,
          quantity: leg3Quantity,
        });
        const leg3Result = await this.orderExecutor.executeOrder({
          symbol: opportunity.leg3.pair,
          side: opportunity.leg3.side,
          quantity: leg3Quantity,
        });

        await this.database.updateTrade(tradeId, {
          leg3_amount: leg3Quantity,
          leg3_filled: leg3Result.executedQty,
        });

        const fees = this.feeCalculator.calculateTriangleFees(
          leg1Result,
          leg2Result,
          leg3Result
        );
        const endAmount = leg3Result.executedQty * leg3Result.price;
        const profit = this.feeCalculator.calculateProfit(startAmount, endAmount, fees);

        await this.database.updateTrade(tradeId, {
          actual_profit_percent: profit.netProfitPercent,
          actual_profit_usdt: profit.netProfit,
          status: 'completed',
          completed_at: new Date().toISOString(),
        });

        logger.info('Triangle execution completed successfully', {
          tradeId,
          netProfit: profit.netProfit.toFixed(4),
          netProfitPercent: profit.netProfitPercent.toFixed(4),
        });

        this.feeCalculator.logFeeBreakdown(fees);
        this.feeCalculator.logProfitBreakdown(profit);

        return {
          success: true,
          tradeId,
          profit: profit.netProfit,
          profitPercent: profit.netProfitPercent,
        };
      } catch (error) {
        logger.error('Triangle execution failed', { tradeId, error });

        await this.database.updateTrade(tradeId, {
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          completed_at: new Date().toISOString(),
        });

        return {
          success: false,
          tradeId,
          error: error instanceof Error ? error.message : 'Unknown error',
          partialFill: true,
        };
      }
    } finally {
      this.isExecuting = false;
    }
  }

  isCurrentlyExecuting(): boolean {
    return this.isExecuting;
  }
}

export default TriangleExecutor;
