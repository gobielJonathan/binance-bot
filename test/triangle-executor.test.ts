import TriangleExecutor from '../src/services/trading/triangle-executor';
import OrderExecutor, { OrderExecution } from '../src/services/trading/order-executor';
import BalanceManager from '../src/services/trading/balance-manager';
import FeeCalculator from '../src/services/trading/fee-calculator';
import Database from '../src/services/database';
import { TradeRepository } from '../src/repositories';
import { ArbitrageOpportunity } from '../src/models/opportunity';
import { TrianglePath } from '../src/models/triangle';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockOpportunity: ArbitrageOpportunity = {
  triangleName: 'BTC-ETH-USDT',
  spreadPercent: 0.5,
  netProfitPercent: 0.3,
  estimatedProfitUSDT: 0.3,
  leg1: { pair: 'BTCUSDT', side: 'BUY',  price: 50000, amount: 100 },
  leg2: { pair: 'ETHBTC',  side: 'BUY',  price: 0.06,  amount: 0.002 },
  leg3: { pair: 'ETHUSDT', side: 'SELL', price: 3000,  amount: 0.0333 },
  timestamp: Date.now(),
};

const mockTriangle: TrianglePath = {
  name: 'BTC-ETH-USDT',
  pairs: ['BTCUSDT', 'ETHBTC', 'ETHUSDT'],
  legs: [
    { pair: 'BTCUSDT', side: 'BUY',  baseAsset: 'BTC', quoteAsset: 'USDT' },
    { pair: 'ETHBTC',  side: 'BUY',  baseAsset: 'ETH', quoteAsset: 'BTC'  },
    { pair: 'ETHUSDT', side: 'SELL', baseAsset: 'ETH', quoteAsset: 'USDT' },
  ],
};

function makeLegResult(
  symbol: string,
  side: string,
  executedQty: number,
  price: number
): OrderExecution {
  return {
    orderId: Math.floor(Math.random() * 100000),
    symbol,
    side,
    executedQty,
    price,
    status: 'FILLED',
    timestamp: Date.now(),
  };
}

const leg1Result = makeLegResult('BTCUSDT', 'BUY',  0.002,   50000);
const leg2Result = makeLegResult('ETHBTC',  'BUY',  0.0333,  0.06);
const leg3Result = makeLegResult('ETHUSDT', 'SELL', 0.0333,  3000);
// Recovery results: yield just ~1 USDT — always less than the minimum $10 startAmount,
// ensuring actual_profit_usdt is definitively negative regardless of config/env settings.
const leg2RecoveryResult = makeLegResult('BTCUSDT', 'SELL', 0.00002, 49800); // ~0.996 USDT
const leg3RecoveryResult = makeLegResult('ETHUSDT', 'SELL', 0.0003, 3000);   // ~0.9 USDT

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

function makeExecutor() {
  const orderExecutor = {
    executeOrder: jest.fn(),
  } as unknown as jest.Mocked<OrderExecutor>;

  const balanceManager = {
    getUSDTBalance: jest.fn().mockResolvedValue(1000),
  } as unknown as jest.Mocked<BalanceManager>;

  const feeCalculator = {
    calculateTriangleFees: jest.fn().mockReturnValue({
      leg1Fee: 0.001,
      leg2Fee: 0.001,
      leg3Fee: 0.001,
      totalFees: 0.003,
      totalFeesPercent: 0.3,
      feeAsset: 'USDT',
    }),
    calculateProfit: jest.fn().mockReturnValue({
      startAmount: 100,
      endAmount: 100.30,
      grossProfit: 0.40,
      grossProfitPercent: 0.40,
      totalFees: 0.003,
      netProfit: 0.30,
      netProfitPercent: 0.30,
    }),
    logFeeBreakdown: jest.fn(),
    logProfitBreakdown: jest.fn(),
  } as unknown as jest.Mocked<FeeCalculator>;

  const database = {} as Database;

  const tradeRepository = {
    insertTrade: jest.fn().mockResolvedValue(1),
    updateTrade: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<TradeRepository>;

  const executor = new TriangleExecutor(
    orderExecutor,
    balanceManager,
    feeCalculator,
    database,
    tradeRepository
  );

  return { executor, orderExecutor, balanceManager, feeCalculator, tradeRepository };
}

// Helper: get all status values passed to updateTrade
function getStatusUpdates(tradeRepository: jest.Mocked<TradeRepository>) {
  return tradeRepository.updateTrade.mock.calls
    .map(([, updates]) => updates.status)
    .filter(Boolean) as string[];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TriangleExecutor', () => {
  describe('isCurrentlyExecuting()', () => {
    it('returns false on a fresh instance', () => {
      const { executor } = makeExecutor();
      expect(executor.isCurrentlyExecuting()).toBe(false);
    });
  });

  describe('executeTriangle()', () => {
    // -----------------------------------------------------------------------
    // Happy path
    // -----------------------------------------------------------------------
    describe('happy path — all legs succeed', () => {
      it('returns success:true with profit fields', async () => {
        const { executor, orderExecutor } = makeExecutor();
        orderExecutor.executeOrder
          .mockResolvedValueOnce(leg1Result)
          .mockResolvedValueOnce(leg2Result)
          .mockResolvedValueOnce(leg3Result);

        const result = await executor.executeTriangle(mockOpportunity, mockTriangle);

        expect(result.success).toBe(true);
        expect(result.tradeId).toBe(1);
        expect(result.profit).toBeDefined();
        expect(result.profitPercent).toBeDefined();
        expect(result.recoveryAttempted).toBeUndefined();
      });

      it('calls executeOrder exactly 3 times', async () => {
        const { executor, orderExecutor } = makeExecutor();
        orderExecutor.executeOrder
          .mockResolvedValueOnce(leg1Result)
          .mockResolvedValueOnce(leg2Result)
          .mockResolvedValueOnce(leg3Result);

        await executor.executeTriangle(mockOpportunity, mockTriangle);

        expect(orderExecutor.executeOrder).toHaveBeenCalledTimes(3);
      });

      it('marks the trade as completed', async () => {
        const { executor, orderExecutor, tradeRepository } = makeExecutor();
        orderExecutor.executeOrder
          .mockResolvedValueOnce(leg1Result)
          .mockResolvedValueOnce(leg2Result)
          .mockResolvedValueOnce(leg3Result);

        await executor.executeTriangle(mockOpportunity, mockTriangle);

        expect(getStatusUpdates(tradeRepository)).toContain('completed');
      });

      it('resets isExecuting to false after completion', async () => {
        const { executor, orderExecutor } = makeExecutor();
        orderExecutor.executeOrder
          .mockResolvedValueOnce(leg1Result)
          .mockResolvedValueOnce(leg2Result)
          .mockResolvedValueOnce(leg3Result);

        await executor.executeTriangle(mockOpportunity, mockTriangle);

        expect(executor.isCurrentlyExecuting()).toBe(false);
      });
    });

    // -----------------------------------------------------------------------
    // Order execution parameters
    // -----------------------------------------------------------------------
    describe('order execution parameters', () => {
      beforeEach(() => {});

      it('leg 1 quantity = startAmount / leg1.price', async () => {
        const { executor, orderExecutor, balanceManager } = makeExecutor();
        // USDT balance = 1000, maxPositionPercent = 10  →  maxPosition = 100
        // opportunity.leg1.amount = 100  →  startAmount = min(100, 100) = 100
        balanceManager.getUSDTBalance.mockResolvedValue(1000);
        orderExecutor.executeOrder
          .mockResolvedValueOnce(leg1Result)
          .mockResolvedValueOnce(leg2Result)
          .mockResolvedValueOnce(leg3Result);

        await executor.executeTriangle(mockOpportunity, mockTriangle);

        const call = orderExecutor.executeOrder.mock.calls[0][0];
        expect(call.symbol).toBe('BTCUSDT');
        expect(call.side).toBe('BUY');
        expect(call.quantity).toBeCloseTo(100 / 50000);
      });

      it('leg 2 quantity = leg1Result.executedQty', async () => {
        const { executor, orderExecutor } = makeExecutor();
        orderExecutor.executeOrder
          .mockResolvedValueOnce(leg1Result)
          .mockResolvedValueOnce(leg2Result)
          .mockResolvedValueOnce(leg3Result);

        await executor.executeTriangle(mockOpportunity, mockTriangle);

        const call = orderExecutor.executeOrder.mock.calls[1][0];
        expect(call.quantity).toBe(leg1Result.executedQty);
      });

      it('leg 3 quantity = leg2Result.executedQty', async () => {
        const { executor, orderExecutor } = makeExecutor();
        orderExecutor.executeOrder
          .mockResolvedValueOnce(leg1Result)
          .mockResolvedValueOnce(leg2Result)
          .mockResolvedValueOnce(leg3Result);

        await executor.executeTriangle(mockOpportunity, mockTriangle);

        const call = orderExecutor.executeOrder.mock.calls[2][0];
        expect(call.quantity).toBe(leg2Result.executedQty);
      });
    });

    // -----------------------------------------------------------------------
    // Concurrency guard
    // -----------------------------------------------------------------------
    describe('concurrency guard', () => {
      it('rejects a second call while execution is in progress', async () => {
        const { executor, orderExecutor } = makeExecutor();
        // never-resolving first leg to keep isExecuting = true
        orderExecutor.executeOrder.mockReturnValueOnce(new Promise(() => {}));

        executor.executeTriangle(mockOpportunity, mockTriangle); // not awaited

        const result = await executor.executeTriangle(mockOpportunity, mockTriangle);
        expect(result.success).toBe(false);
        expect(result.error).toBe('Execution in progress');
      });
    });

    // -----------------------------------------------------------------------
    // Insufficient balance
    // -----------------------------------------------------------------------
    describe('insufficient balance', () => {
      it('returns early when startAmount < 10 USDT', async () => {
        const { executor, balanceManager, orderExecutor } = makeExecutor();
        // balance = 0.05 USDT  →  maxPosition = 0.05 * 10 / 100 = 0.005 < 10
        balanceManager.getUSDTBalance.mockResolvedValue(0.05);

        const result = await executor.executeTriangle(mockOpportunity, mockTriangle);

        expect(result.success).toBe(false);
        expect(result.error).toMatch(/below.*minimum notional/i);
        expect(orderExecutor.executeOrder).not.toHaveBeenCalled();
      });
    });

    // -----------------------------------------------------------------------
    // Trade record persistence
    // -----------------------------------------------------------------------
    describe('trade record persistence', () => {
      it('inserts a pending trade before executing any leg', async () => {
        const { executor, orderExecutor, tradeRepository } = makeExecutor();
        orderExecutor.executeOrder
          .mockResolvedValueOnce(leg1Result)
          .mockResolvedValueOnce(leg2Result)
          .mockResolvedValueOnce(leg3Result);

        await executor.executeTriangle(mockOpportunity, mockTriangle);

        expect(tradeRepository.insertTrade).toHaveBeenCalledTimes(1);
        const inserted = tradeRepository.insertTrade.mock.calls[0][0];
        expect(inserted.status).toBe('pending');
        expect(inserted.triangle_name).toBe(mockOpportunity.triangleName);
      });

      it('records leg1_filled after leg 1 completes', async () => {
        const { executor, orderExecutor, tradeRepository } = makeExecutor();
        orderExecutor.executeOrder
          .mockResolvedValueOnce(leg1Result)
          .mockResolvedValueOnce(leg2Result)
          .mockResolvedValueOnce(leg3Result);

        await executor.executeTriangle(mockOpportunity, mockTriangle);

        const allUpdates = tradeRepository.updateTrade.mock.calls.map(([, u]) => u);
        expect(allUpdates.some((u) => u.leg1_filled === leg1Result.executedQty)).toBe(true);
      });
    });

    // -----------------------------------------------------------------------
    // Leg 1 failure — nothing acquired, no recovery needed
    // -----------------------------------------------------------------------
    describe('leg 1 failure', () => {
      it('marks status as failed and returns success:false', async () => {
        const { executor, orderExecutor, tradeRepository } = makeExecutor();
        orderExecutor.executeOrder.mockRejectedValueOnce(new Error('Leg 1 API error'));

        const result = await executor.executeTriangle(mockOpportunity, mockTriangle);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Leg 1 API error');
        expect(getStatusUpdates(tradeRepository)).toContain('failed');
      });

      it('does not attempt recovery (no funds acquired)', async () => {
        const { executor, orderExecutor } = makeExecutor();
        orderExecutor.executeOrder.mockRejectedValueOnce(new Error('fail'));

        const result = await executor.executeTriangle(mockOpportunity, mockTriangle);

        expect(orderExecutor.executeOrder).toHaveBeenCalledTimes(1);
        expect(result.recoveryAttempted).toBeUndefined();
      });

      it('resets isExecuting to false', async () => {
        const { executor, orderExecutor } = makeExecutor();
        orderExecutor.executeOrder.mockRejectedValueOnce(new Error('fail'));

        await executor.executeTriangle(mockOpportunity, mockTriangle);

        expect(executor.isCurrentlyExecuting()).toBe(false);
      });
    });

    // -----------------------------------------------------------------------
    // Leg 2 failure — holds the leg 1 intermediate token, reverses leg 1
    // -----------------------------------------------------------------------
    describe('leg 2 failure', () => {
      describe('when recovery succeeds', () => {
        it('calls recovery with reversed side (BUY → SELL) and leg1 pair', async () => {
          const { executor, orderExecutor } = makeExecutor();
          orderExecutor.executeOrder
            .mockResolvedValueOnce(leg1Result)               // leg 1 OK
            .mockRejectedValueOnce(new Error('Leg 2 fail')) // leg 2 fails
            .mockResolvedValueOnce(leg2RecoveryResult);      // recovery OK

          await executor.executeTriangle(mockOpportunity, mockTriangle);

          // 3rd executeOrder call is the recovery
          const recoveryCall = orderExecutor.executeOrder.mock.calls[2][0];
          expect(recoveryCall.symbol).toBe(mockOpportunity.leg1.pair); // BTCUSDT
          expect(recoveryCall.side).toBe('SELL');                      // reversed from BUY
          expect(recoveryCall.quantity).toBe(leg1Result.executedQty);
        });

        it('returns recoveryAttempted:true, recoverySuccess:true with recoveryAmountUSDT', async () => {
          const { executor, orderExecutor } = makeExecutor();
          orderExecutor.executeOrder
            .mockResolvedValueOnce(leg1Result)
            .mockRejectedValueOnce(new Error('Leg 2 fail'))
            .mockResolvedValueOnce(leg2RecoveryResult);

          const result = await executor.executeTriangle(mockOpportunity, mockTriangle);

          expect(result.success).toBe(false);
          expect(result.recoveryAttempted).toBe(true);
          expect(result.recoverySuccess).toBe(true);
          expect(result.recoveryAmountUSDT).toBeCloseTo(
            leg2RecoveryResult.executedQty * leg2RecoveryResult.price
          );
        });

        it('marks trade as recovered with negative actual_profit_usdt', async () => {
          const { executor, orderExecutor, tradeRepository } = makeExecutor();
          orderExecutor.executeOrder
            .mockResolvedValueOnce(leg1Result)
            .mockRejectedValueOnce(new Error('Leg 2 fail'))
            .mockResolvedValueOnce(leg2RecoveryResult);

          await executor.executeTriangle(mockOpportunity, mockTriangle);

          const allUpdates = tradeRepository.updateTrade.mock.calls.map(([, u]) => u);
          const finalUpdate = allUpdates.find((u) => u.status === 'recovered');
          expect(finalUpdate).toBeDefined();
          expect(finalUpdate!.actual_profit_usdt).toBeLessThan(0);
          expect(finalUpdate!.actual_profit_percent).toBeLessThan(0);
        });

        it('transitions: in_progress → recovering → recovered', async () => {
          const { executor, orderExecutor, tradeRepository } = makeExecutor();
          orderExecutor.executeOrder
            .mockResolvedValueOnce(leg1Result)
            .mockRejectedValueOnce(new Error('fail'))
            .mockResolvedValueOnce(leg2RecoveryResult);

          await executor.executeTriangle(mockOpportunity, mockTriangle);

          const statuses = getStatusUpdates(tradeRepository);
          expect(statuses).toContain('in_progress');
          expect(statuses).toContain('recovering');
          expect(statuses).toContain('recovered');
        });
      });

      describe('when recovery also fails', () => {
        it('marks trade as stranded', async () => {
          const { executor, orderExecutor, tradeRepository } = makeExecutor();
          orderExecutor.executeOrder
            .mockResolvedValueOnce(leg1Result)
            .mockRejectedValueOnce(new Error('Leg 2 fail'))
            .mockRejectedValueOnce(new Error('Recovery fail'));

          const result = await executor.executeTriangle(mockOpportunity, mockTriangle);

          expect(result.recoveryAttempted).toBe(true);
          expect(result.recoverySuccess).toBe(false);
          expect(result.recoveryAmountUSDT).toBeUndefined();
          expect(getStatusUpdates(tradeRepository)).toContain('stranded');
        });
      });

      describe('side inversion', () => {
        it('uses BUY recovery when leg1 side is SELL', async () => {
          const { executor, orderExecutor } = makeExecutor();
          const sellFirstOpportunity: ArbitrageOpportunity = {
            ...mockOpportunity,
            leg1: { ...mockOpportunity.leg1, side: 'SELL' },
          };
          orderExecutor.executeOrder
            .mockResolvedValueOnce({ ...leg1Result, side: 'SELL' })
            .mockRejectedValueOnce(new Error('fail'))
            .mockResolvedValueOnce(leg2RecoveryResult);

          await executor.executeTriangle(sellFirstOpportunity, mockTriangle);

          const recoveryCall = orderExecutor.executeOrder.mock.calls[2][0];
          expect(recoveryCall.side).toBe('BUY');
        });
      });
    });

    // -----------------------------------------------------------------------
    // Leg 3 failure — holds leg 2 token, re-executes leg 3 (already → USDT)
    // -----------------------------------------------------------------------
    describe('leg 3 failure', () => {
      describe('when recovery succeeds', () => {
        it('calls recovery with leg3 pair and same side', async () => {
          const { executor, orderExecutor } = makeExecutor();
          orderExecutor.executeOrder
            .mockResolvedValueOnce(leg1Result)
            .mockResolvedValueOnce(leg2Result)
            .mockRejectedValueOnce(new Error('Leg 3 fail'))
            .mockResolvedValueOnce(leg3RecoveryResult);

          await executor.executeTriangle(mockOpportunity, mockTriangle);

          const recoveryCall = orderExecutor.executeOrder.mock.calls[3][0];
          expect(recoveryCall.symbol).toBe(mockOpportunity.leg3.pair); // ETHUSDT
          expect(recoveryCall.side).toBe(mockOpportunity.leg3.side);   // SELL
          expect(recoveryCall.quantity).toBe(leg2Result.executedQty);
        });

        it('returns recoveryAttempted:true, recoverySuccess:true', async () => {
          const { executor, orderExecutor } = makeExecutor();
          orderExecutor.executeOrder
            .mockResolvedValueOnce(leg1Result)
            .mockResolvedValueOnce(leg2Result)
            .mockRejectedValueOnce(new Error('Leg 3 fail'))
            .mockResolvedValueOnce(leg3RecoveryResult);

          const result = await executor.executeTriangle(mockOpportunity, mockTriangle);

          expect(result.success).toBe(false);
          expect(result.recoveryAttempted).toBe(true);
          expect(result.recoverySuccess).toBe(true);
        });

        it('marks trade as recovered with negative actual_profit_usdt', async () => {
          const { executor, orderExecutor, tradeRepository } = makeExecutor();
          orderExecutor.executeOrder
            .mockResolvedValueOnce(leg1Result)
            .mockResolvedValueOnce(leg2Result)
            .mockRejectedValueOnce(new Error('Leg 3 fail'))
            .mockResolvedValueOnce(leg3RecoveryResult);

          await executor.executeTriangle(mockOpportunity, mockTriangle);

          const allUpdates = tradeRepository.updateTrade.mock.calls.map(([, u]) => u);
          const finalUpdate = allUpdates.find((u) => u.status === 'recovered');
          expect(finalUpdate).toBeDefined();
          expect(finalUpdate!.actual_profit_usdt).toBeLessThan(0);
        });

        it('transitions: in_progress → recovering → recovered', async () => {
          const { executor, orderExecutor, tradeRepository } = makeExecutor();
          orderExecutor.executeOrder
            .mockResolvedValueOnce(leg1Result)
            .mockResolvedValueOnce(leg2Result)
            .mockRejectedValueOnce(new Error('fail'))
            .mockResolvedValueOnce(leg3RecoveryResult);

          await executor.executeTriangle(mockOpportunity, mockTriangle);

          const statuses = getStatusUpdates(tradeRepository);
          expect(statuses).toContain('recovering');
          expect(statuses).toContain('recovered');
        });
      });

      describe('when recovery also fails', () => {
        it('marks trade as stranded', async () => {
          const { executor, orderExecutor, tradeRepository } = makeExecutor();
          orderExecutor.executeOrder
            .mockResolvedValueOnce(leg1Result)
            .mockResolvedValueOnce(leg2Result)
            .mockRejectedValueOnce(new Error('Leg 3 fail'))
            .mockRejectedValueOnce(new Error('Recovery fail'));

          const result = await executor.executeTriangle(mockOpportunity, mockTriangle);

          expect(result.recoveryAttempted).toBe(true);
          expect(result.recoverySuccess).toBe(false);
          expect(getStatusUpdates(tradeRepository)).toContain('stranded');
        });
      });
    });
  });
});
