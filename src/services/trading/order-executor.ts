import BinanceService, { OrderResult } from '../binance';
import logger from '../../utils/logger';
import config from '../../config';

export interface OrderRequest {
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
}

export interface OrderExecution {
  orderId: number;
  symbol: string;
  side: string;
  executedQty: number;
  price: number;
  status: string;
  timestamp: number;
}

class OrderExecutor {
  private binanceService: BinanceService;
  private pendingOrders: Map<number, OrderExecution> = new Map();

  constructor(binanceService: BinanceService) {
    this.binanceService = binanceService;
    logger.info('Order executor initialized', {
      timeout: config.execution.orderTimeoutMs,
    });
  }

  async executeOrder(request: OrderRequest): Promise<OrderExecution> {
    const { symbol, side } = request;
    let { quantity } = request;

    try {
      // Snap quantity to exchange LOT_SIZE requirements
      const lotSize = await this.binanceService.getLotSizeFilter(symbol);
      quantity = Math.floor(quantity / lotSize.stepSize) * lotSize.stepSize;
      quantity = parseFloat(quantity.toFixed(lotSize.stepDecimals));

      if (quantity < lotSize.minQty) {
        throw new Error(
          `Quantity ${quantity} is below minQty ${lotSize.minQty} for ${symbol}`
        );
      }

      logger.info('Executing order', { symbol, side, quantity });

      const startTime = Date.now();
      let result: OrderResult;

      if (side === 'BUY') {
        result = await this.binanceService.marketBuy(symbol, quantity);
      } else {
        result = await this.binanceService.marketSell(symbol, quantity);
      }

      const executionTime = Date.now() - startTime;

      const execution: OrderExecution = {
        orderId: result.orderId,
        symbol: result.symbol,
        side: result.side,
        executedQty: parseFloat(result.executedQty),
        price: parseFloat(result.price || result.cummulativeQuoteQty) / parseFloat(result.executedQty),
        status: result.status,
        timestamp: Date.now(),
      };

      this.pendingOrders.set(execution.orderId, execution);

      logger.info('Order executed successfully', {
        orderId: execution.orderId,
        symbol,
        side,
        executedQty: execution.executedQty,
        executionTime,
      });

      return execution;
    } catch (error) {
      logger.error('Order execution failed', { symbol, side, quantity, error });
      throw error;
    }
  }

  async verifyOrderFilled(symbol: string, orderId: number): Promise<boolean> {
    try {
      const order = await this.binanceService.getOrder(symbol, orderId);
      return order.status === 'FILLED';
    } catch (error) {
      logger.error('Failed to verify order', { symbol, orderId, error });
      return false;
    }
  }

  getOrderExecution(orderId: number): OrderExecution | undefined {
    return this.pendingOrders.get(orderId);
  }

  clearPendingOrders(): void {
    this.pendingOrders.clear();
  }
}

export default OrderExecutor;
