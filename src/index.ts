import config from './config';
import logger from './utils/logger';
import BinanceService from './services/binance';
import Database from './services/database';
import WebSocketClient from './services/market/websocket';
import PriceAggregator from './services/market/price-aggregator';
import TriangleScanner from './services/market/triangle-scanner';
import OpportunityDetector from './services/market/opportunity-detector';
import LiquidityFilter from './services/market/liquidity-filter';
import OrderExecutor from './services/trading/order-executor';
import BalanceManager from './services/trading/balance-manager';
import FeeCalculator from './services/trading/fee-calculator';
import TriangleExecutor from './services/trading/triangle-executor';
import DashboardServer from './controllers/dashboard';
import { TradeRepository, OpportunityRepository, MetricsRepository } from './repositories';

class TradingBot {
  private binanceService: BinanceService;
  private database: Database;
  private tradeRepository: TradeRepository;
  private opportunityRepository: OpportunityRepository;
  private metricsRepository: MetricsRepository;
  private wsClient: WebSocketClient;
  private priceAggregator: PriceAggregator;
  private triangleScanner: TriangleScanner;
  private opportunityDetector: OpportunityDetector;
  private liquidityFilter: LiquidityFilter;
  private orderExecutor: OrderExecutor;
  private balanceManager: BalanceManager;
  private feeCalculator: FeeCalculator;
  private triangleExecutor: TriangleExecutor;
  private dashboardServer: DashboardServer;
  private isRunning: boolean = false;

  // Risk tracking
  private activeTrades: number = 0;
  private consecutiveLosses: number = 0;
  private initialBalanceUSDT: number = 0;

  constructor() {
    const mode = config.exchange.testnet ? 'TESTNET' : 'LIVE';
    logger.info(`Initializing trading bot... [${mode} MODE]`, {
      testnet: config.exchange.testnet,
      minSpread: config.strategy.minSpreadPercent,
    });

    this.binanceService = new BinanceService();
    this.database = new Database();
    
    // Create repositories
    this.tradeRepository = new TradeRepository(this.database.getDatabase());
    this.opportunityRepository = new OpportunityRepository(this.database.getDatabase());
    this.metricsRepository = new MetricsRepository(this.database.getDatabase());
    
    this.wsClient = new WebSocketClient(this.binanceService.getClient());
    this.priceAggregator = new PriceAggregator();
    this.triangleScanner = new TriangleScanner();
    this.opportunityDetector = new OpportunityDetector(
      this.priceAggregator,
      this.triangleScanner
    );
    this.liquidityFilter = new LiquidityFilter(this.binanceService);

    this.orderExecutor = new OrderExecutor(this.binanceService);
    this.balanceManager = new BalanceManager(this.binanceService);
    this.feeCalculator = new FeeCalculator();
    this.triangleExecutor = new TriangleExecutor(
      this.orderExecutor,
      this.balanceManager,
      this.feeCalculator,
      this.database,
      this.tradeRepository
    );

    this.dashboardServer = new DashboardServer(
      this.database,
      this.tradeRepository,
      this.opportunityRepository,
      this.metricsRepository,
      this.balanceManager
    );

    logger.info('Trading bot initialized successfully');
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Trading bot is already running');
      return;
    }

    try {
      // Display startup warnings
      this.displayStartupWarnings();

      logger.info('Starting trading bot...');

      const connected = await this.binanceService.testConnection();
      if (!connected) {
        throw new Error('Failed to connect to Binance');
      }

      await this.balanceManager.updateBalances();
      const usdtBalance = await this.balanceManager.getUSDTBalance();
      const totalBalance = await this.balanceManager.getTotalBalanceUSDT();
      this.initialBalanceUSDT = totalBalance; // snapshot for stop-loss tracking
      
      logger.info('Account balance', { 
        available: usdtBalance.toFixed(2),
        total: totalBalance.toFixed(2),
        mode: config.exchange.testnet ? 'TESTNET' : 'LIVE'
      });

      // Additional safety check for live trading
      if (!config.exchange.testnet) {
        logger.warn('⚠️  LIVE TRADING MODE - Real funds at risk!');
        logger.info('Max position per trade:', {
          percent: config.strategy.maxPositionPercent + '%',
          maxUSDT: (usdtBalance * config.strategy.maxPositionPercent / 100).toFixed(2)
        });
      }

      const allPairs = this.triangleScanner.getAllPairs();
      logger.info('Subscribing to market data', { pairs: allPairs.length });

      this.wsClient.subscribeToMultipleTickers(allPairs, (priceData) => {
        this.priceAggregator.updatePrice(priceData);
      });

      // Broadcast live bid/ask to dashboard clients — throttled per symbol to ~2/sec
      const tickerLastSent = new Map<string, number>();
      const TICKER_THROTTLE_MS = 500;
      this.priceAggregator.onPriceUpdate((_symbol, priceData) => {
        const now = Date.now();
        const last = tickerLastSent.get(priceData.symbol) ?? 0;
        if (now - last >= TICKER_THROTTLE_MS) {
          tickerLastSent.set(priceData.symbol, now);
          this.dashboardServer.broadcastTicker(priceData);
        }
      });

      this.opportunityDetector.onOpportunity(async (opportunity) => {
        this.dashboardServer.broadcastOpportunity(opportunity);
        await this.handleOpportunity(opportunity);
      });

      this.dashboardServer.start();

      this.isRunning = true;
      logger.info('✅ Trading bot started successfully');

      logger.info('Bot is monitoring for arbitrage opportunities...');
      logger.info('Press Ctrl+C to stop');
    } catch (error) {
      logger.error('Failed to start trading bot', { error });
      throw error;
    }
  }

  private async handleOpportunity(opportunity: any): Promise<void> {
    try {
      // --- Risk: consecutive loss limit ---
      if (this.consecutiveLosses >= config.risk.consecutiveLossLimit) {
        logger.warn('🛑 Consecutive loss limit reached — bot paused', {
          consecutiveLosses: this.consecutiveLosses,
          limit: config.risk.consecutiveLossLimit,
        });
        return;
      }

      // --- Risk: stop-loss on total balance ---
      if (this.initialBalanceUSDT > 0) {
        const currentBalance = await this.balanceManager.getTotalBalanceUSDT();
        const drawdownPercent = ((this.initialBalanceUSDT - currentBalance) / this.initialBalanceUSDT) * 100;
        if (drawdownPercent >= config.risk.stopLossPercent) {
          logger.warn('🛑 Stop-loss triggered — bot paused', {
            initialBalance: this.initialBalanceUSDT.toFixed(2),
            currentBalance: currentBalance.toFixed(2),
            drawdownPercent: drawdownPercent.toFixed(2),
            stopLossPercent: config.risk.stopLossPercent,
          });
          return;
        }
      }

      // --- Risk: max concurrent trades ---
      if (this.activeTrades >= config.risk.maxConcurrentTrades) {
        logger.debug('Skipping opportunity - max concurrent trades reached', {
          activeTrades: this.activeTrades,
          max: config.risk.maxConcurrentTrades,
        });
        return;
      }

      await this.database.insertOpportunity({
        triangle_name: opportunity.triangleName,
        spread_percent: opportunity.spreadPercent,
        leg1_pair: opportunity.leg1.pair,
        leg1_price: opportunity.leg1.price,
        leg2_pair: opportunity.leg2.pair,
        leg2_price: opportunity.leg2.price,
        leg3_pair: opportunity.leg3.pair,
        leg3_price: opportunity.leg3.price,
        executed: false,
        created_at: new Date().toISOString(),
      });

      if (this.triangleExecutor.isCurrentlyExecuting()) {
        logger.debug('Skipping opportunity - execution in progress', {
          triangle: opportunity.triangleName,
        });
        return;
      }

      const triangle = this.triangleScanner.getTriangleByName(opportunity.triangleName);
      if (!triangle) {
        logger.warn('Triangle not found', { name: opportunity.triangleName });
        return;
      }

      const hasLiquidity = await this.liquidityFilter.checkTriangleLiquidity(triangle.pairs);
      if (!hasLiquidity) {
        logger.debug('Skipping opportunity - insufficient liquidity', {
          triangle: opportunity.triangleName,
        });
        return;
      }

      logger.info('🚀 Executing profitable opportunity!', {
        triangle: opportunity.triangleName,
        spread: opportunity.spreadPercent.toFixed(4),
        netProfit: opportunity.netProfitPercent.toFixed(4),
      });

      this.activeTrades++;
      const result = await this.triangleExecutor.executeTriangle(opportunity, triangle);
      this.activeTrades = Math.max(0, this.activeTrades - 1);

      if (result.success) {
        this.consecutiveLosses = 0; // reset on win
        logger.info('✅ Trade completed successfully', {
          profit: result.profit?.toFixed(4),
          profitPercent: result.profitPercent?.toFixed(4),
        });

        await this.database.insertMetric({
          metric_type: 'profit',
          value: result.profit || 0,
          timestamp: new Date().toISOString(),
        });

        // Broadcast trade completion to dashboard
        this.dashboardServer.broadcastTradeUpdate({
          tradeId: result.tradeId,
          profit: result.profit,
          profitPercent: result.profitPercent,
          status: 'completed',
          timestamp: new Date().toISOString(),
        });
      } else {
        // Only count real execution failures — pre-validation rejections have no tradeId
        if (result.tradeId != null) {
          this.consecutiveLosses++;
        }
        logger.error('❌ Trade failed', {
          error: result.error,
          consecutiveLosses: this.consecutiveLosses,
          limit: config.risk.consecutiveLossLimit,
        });
        
        // Broadcast failure to dashboard
        this.dashboardServer.broadcastTradeUpdate({
          tradeId: result.tradeId,
          status: 'failed',
          error: result.error,
          timestamp: new Date().toISOString(),
        });
      }

      await this.balanceManager.updateBalances();
    } catch (error) {
      this.activeTrades = Math.max(0, this.activeTrades - 1);
      logger.error('Error handling opportunity', { error });
    }
  }

  async stop(): Promise<void> {
    logger.info('Stopping trading bot...');

    this.wsClient.unsubscribeAll();
    this.dashboardServer.stop();
    await this.database.close();

    this.isRunning = false;
    logger.info('Trading bot stopped');
  }

  private displayStartupWarnings(): void {
    console.log('\n' + '='.repeat(70));
    
    if (!config.exchange.testnet) {
      console.log('⚠️  WARNING: LIVE TRADING MODE ENABLED');
      console.log('='.repeat(70));
      console.log('🔴 You are using REAL FUNDS on the live Binance exchange');
      console.log('🔴 Trading involves substantial risk of loss');
      console.log('🔴 Only trade what you can afford to lose');
      console.log('='.repeat(70));
      console.log('\nSafety Settings:');
      console.log(`  • Max Position Size: ${config.strategy.maxPositionPercent}% per trade`);
      console.log(`  • Min Spread Required: ${config.strategy.minSpreadPercent}%`);
      console.log(`  • Min Liquidity: $${config.strategy.minLiquidity24h.toLocaleString()}`);
      console.log(`  • Max Concurrent Trades: ${config.risk.maxConcurrentTrades}`);
      console.log('\n⚠️  Monitor your trades carefully!');
    } else {
      console.log('✅ TESTNET MODE - Safe Testing Environment');
      console.log('='.repeat(70));
      console.log('📊 You are using test funds on Binance Testnet');
      console.log('✅ No real money at risk');
      console.log('✅ Perfect for testing and learning');
    }
    
    console.log('='.repeat(70) + '\n');
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      mode: config.exchange.testnet ? 'testnet' : 'live',
      priceData: this.priceAggregator.getStats(),
      opportunities: this.opportunityDetector.getStats(),
    };
  }
}

async function main() {
  const bot = new TradingBot();

  process.on('SIGINT', async () => {
    logger.info('\nReceived SIGINT, shutting down gracefully...');
    await bot.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('\nReceived SIGTERM, shutting down gracefully...');
    await bot.stop();
    process.exit(0);
  });

  try {
    await bot.start();
  } catch (error) {
    logger.error('Fatal error', { error });
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export default TradingBot;
