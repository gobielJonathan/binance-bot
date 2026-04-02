import logger from '../../utils/logger';
import Database, { Trade } from '../database';
import { TradeRepository } from '../../repositories';
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
  recoveryAttempted?: boolean;
  recoverySuccess?: boolean;
  recoveryAmountUSDT?: number;
}

class TriangleExecutor {
  private orderExecutor: OrderExecutor;
  private balanceManager: BalanceManager;
  private feeCalculator: FeeCalculator;
  private database: Database;
  private tradeRepository: TradeRepository;
  private isExecuting: boolean = false;

  constructor(
    orderExecutor: OrderExecutor,
    balanceManager: BalanceManager,
    feeCalculator: FeeCalculator,
    database: Database,
    tradeRepository: TradeRepository
  ) {
    this.orderExecutor = orderExecutor;
    this.balanceManager = balanceManager;
    this.feeCalculator = feeCalculator;
    this.database = database;
    this.tradeRepository = tradeRepository;

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

      // Pre-validate all legs for NOTIONAL requirements
      try {
        // Leg 1 validation
        const leg1Validation = await this.orderExecutor.validateOrder(
          opportunity.leg1.pair,
          opportunity.leg1.side,
          startAmount / opportunity.leg1.price
        );

        // Amount of asset we have after Leg 1
        const amountAfterLeg1 =
          opportunity.leg1.side === 'BUY'
            ? leg1Validation.adjustedQuantity
            : leg1Validation.adjustedQuantity * leg1Validation.price;

        // Leg 2 validation
        const leg2Quantity =
          opportunity.leg2.side === 'BUY'
            ? amountAfterLeg1 / opportunity.leg2.price
            : amountAfterLeg1;

        const leg2Validation = await this.orderExecutor.validateOrder(
          opportunity.leg2.pair,
          opportunity.leg2.side,
          leg2Quantity
        );

        // Amount of asset we have after Leg 2
        const amountAfterLeg2 =
          opportunity.leg2.side === 'BUY'
            ? leg2Validation.adjustedQuantity
            : leg2Validation.adjustedQuantity * leg2Validation.price;

        // Leg 3 validation
        const leg3Quantity =
          opportunity.leg3.side === 'BUY'
            ? amountAfterLeg2 / opportunity.leg3.price
            : amountAfterLeg2;

        const leg3Validation = await this.orderExecutor.validateOrder(
          opportunity.leg3.pair,
          opportunity.leg3.side,
          leg3Quantity
        );

        logger.info('Pre-execution validation successful', {
          leg1Notional: leg1Validation.notionalValue,
          leg2Notional: leg2Validation.notionalValue,
          leg3Notional: leg3Validation.notionalValue,
        });
      } catch (validationError) {
        const errorMsg =
          validationError instanceof Error ? validationError.message : 'Validation failed';
        logger.warn('Triangle pre-execution validation failed', { error: errorMsg });
        return { success: false, error: `Validation failed: ${errorMsg}` };
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

      const tradeId = await this.tradeRepository.insertTrade(trade);
      await this.tradeRepository.updateTrade(tradeId, { status: 'in_progress' });

      // --- LEG 1 ---
      let leg1Result: Awaited<ReturnType<OrderExecutor['executeOrder']>>;
      try {
        logger.info('Executing leg 1', {
          pair: opportunity.leg1.pair,
          side: opportunity.leg1.side,
          amount: startAmount,
        });
        leg1Result = await this.orderExecutor.executeOrder({
          symbol: opportunity.leg1.pair,
          side: opportunity.leg1.side,
          quantity: startAmount / opportunity.leg1.price,
        });
        await this.tradeRepository.updateTrade(tradeId, {
          leg1_filled: leg1Result.executedQty,
        });
      } catch (error) {
        // Leg 1 failed — nothing was acquired, no recovery needed
        logger.error('Leg 1 failed — no funds at risk', { tradeId, error });
        await this.tradeRepository.updateTrade(tradeId, {
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          completed_at: new Date().toISOString(),
        });
        return {
          success: false,
          tradeId,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }

      // --- LEG 2 ---
      let leg2Result: Awaited<ReturnType<OrderExecutor['executeOrder']>>;
      try {
        // Amount of asset we have after Leg 1
        const amountAfterLeg1 =
          leg1Result.side === 'BUY'
            ? leg1Result.executedQty // we have base asset
            : leg1Result.executedQty * leg1Result.price; // we have quote asset

        // Calculate quantity for leg 2
        const leg2Quantity =
          opportunity.leg2.side === 'BUY'
            ? amountAfterLeg1 / opportunity.leg2.price
            : amountAfterLeg1;

        logger.info('Executing leg 2', {
          pair: opportunity.leg2.pair,
          side: opportunity.leg2.side,
          quantity: leg2Quantity,
        });
        leg2Result = await this.orderExecutor.executeOrder({
          symbol: opportunity.leg2.pair,
          side: opportunity.leg2.side,
          quantity: leg2Quantity,
        });
        await this.tradeRepository.updateTrade(tradeId, {
          leg2_amount: leg2Quantity,
          leg2_filled: leg2Result.executedQty,
        });
      } catch (error) {
        // Leg 2 failed — we hold the intermediate token from leg 1; reverse leg 1 to recover
        logger.error('Leg 2 failed — attempting recovery by reversing leg 1', { tradeId, error });
        await this.tradeRepository.updateTrade(tradeId, { status: 'recovering' });
        const recoverySide = opportunity.leg1.side === 'BUY' ? 'SELL' : 'BUY';
        const recovery = await this.recoverFunds(
          tradeId,
          opportunity.leg1.pair,
          recoverySide,
          leg1Result.executedQty,
          'leg2-failure'
        );
        const loss =
          recovery.recoveredUSDT != null ? startAmount - recovery.recoveredUSDT : startAmount;
        await this.tradeRepository.updateTrade(tradeId, {
          status: recovery.success ? 'recovered' : 'stranded',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          actual_profit_usdt: -loss,
          actual_profit_percent: -(loss / startAmount) * 100,
          completed_at: new Date().toISOString(),
        });
        return {
          success: false,
          tradeId,
          error: error instanceof Error ? error.message : 'Unknown error',
          recoveryAttempted: true,
          recoverySuccess: recovery.success,
          recoveryAmountUSDT: recovery.recoveredUSDT,
        };
      }

      // --- LEG 3 ---
      let leg3Result: Awaited<ReturnType<OrderExecutor['executeOrder']>>;
      let leg3Quantity = 0;
      try {
        // Calculate quantity for leg 3 based on leg 2 result
        const amountAfterLeg2 =
          leg2Result.side === 'BUY'
            ? leg2Result.executedQty
            : leg2Result.executedQty * leg2Result.price;

        leg3Quantity =
          opportunity.leg3.side === 'BUY'
            ? amountAfterLeg2 / opportunity.leg3.price
            : amountAfterLeg2;

        logger.info('Executing leg 3', {
          pair: opportunity.leg3.pair,
          side: opportunity.leg3.side,
          quantity: leg3Quantity,
        });
        leg3Result = await this.orderExecutor.executeOrder({
          symbol: opportunity.leg3.pair,
          side: opportunity.leg3.side,
          quantity: leg3Quantity,
        });
        await this.tradeRepository.updateTrade(tradeId, {
          leg3_amount: leg3Quantity,
          leg3_filled: leg3Result.executedQty,
        });
      } catch (error) {
        // Leg 3 failed — we hold the second intermediate token; leg 3 already returns to USDT, so retry it as recovery
        logger.error('Leg 3 failed — attempting recovery by re-executing leg 3', {
          tradeId,
          error,
        });
        await this.tradeRepository.updateTrade(tradeId, { status: 'recovering' });
        const recovery = await this.recoverFunds(
          tradeId,
          opportunity.leg3.pair,
          opportunity.leg3.side,
          leg3Quantity,
          'leg3-failure'
        );
        const loss =
          recovery.recoveredUSDT != null ? startAmount - recovery.recoveredUSDT : startAmount;
        await this.tradeRepository.updateTrade(tradeId, {
          status: recovery.success ? 'recovered' : 'stranded',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          actual_profit_usdt: -loss,
          actual_profit_percent: -(loss / startAmount) * 100,
          completed_at: new Date().toISOString(),
        });
        return {
          success: false,
          tradeId,
          error: error instanceof Error ? error.message : 'Unknown error',
          recoveryAttempted: true,
          recoverySuccess: recovery.success,
          recoveryAmountUSDT: recovery.recoveredUSDT,
        };
      }

      // --- ALL LEGS COMPLETE ---
      const fees = this.feeCalculator.calculateTriangleFees(leg1Result, leg2Result, leg3Result);
      const endAmount = leg3Result.executedQty * leg3Result.price;
      const profit = this.feeCalculator.calculateProfit(startAmount, endAmount, fees);

      await this.tradeRepository.updateTrade(tradeId, {
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
    } finally {
      this.isExecuting = false;
    }
  }

  private async recoverFunds(
    tradeId: number,
    symbol: string,
    side: 'BUY' | 'SELL',
    quantity: number,
    context: string
  ): Promise<{ success: boolean; recoveredUSDT?: number }> {
    try {
      logger.warn('Attempting recovery order', { tradeId, symbol, side, quantity, context });
      const result = await this.orderExecutor.executeOrder({ symbol, side, quantity });
      const recoveredUSDT = result.executedQty * result.price;
      logger.info('Recovery order succeeded', {
        tradeId,
        symbol,
        side,
        recoveredUSDT: recoveredUSDT.toFixed(4),
        context,
      });
      return { success: true, recoveredUSDT };
    } catch (recoveryError) {
      logger.error('Recovery order failed — funds may be stranded', {
        tradeId,
        symbol,
        side,
        quantity,
        context,
        error: recoveryError,
      });
      return { success: false };
    }
  }

  isCurrentlyExecuting(): boolean {
    return this.isExecuting;
  }
}

export default TriangleExecutor;
