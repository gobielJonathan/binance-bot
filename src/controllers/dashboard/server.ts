import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { createServer } from 'http';

import config from '../../config';
import logger from '../../utils/logger';
import Database from '../../services/database';
import { TradeRepository, OpportunityRepository, MetricsRepository } from '../../repositories';
import BalanceManager from '../../services/trading/balance-manager';

import healthRouter from './routes/health';
import tradesRouter from './routes/trades';
import performanceRouter from './routes/performance';
import balanceRouter from './routes/balance';
import opportunitiesRouter from './routes/opportunities';
import detectPort from 'detect-port';

class DashboardServer {
  private app: express.Application;
  private server: ReturnType<typeof createServer>;
  private io: Server;
  private port: number;

  constructor(
    database: Database,
    tradeRepository: TradeRepository,
    opportunityRepository: OpportunityRepository,
    metricsRepository: MetricsRepository,
    balanceManager: BalanceManager
  ) {
    this.port = config.dashboard.port;
    this.app = express();
    this.server = createServer(this.app);
    this.io = new Server(this.server, {
      cors: { origin: '*', methods: ['GET', 'POST'] },
      path: '/api/socket.io',
    });

    this.setupMiddleware();
    this.setupWebSocket();

    this.app.use('/api', healthRouter);
    this.app.use('/api/trades', tradesRouter(database, tradeRepository));
    this.app.use('/api', performanceRouter(database, metricsRepository));
    this.app.use('/api', balanceRouter(balanceManager));
    this.app.use('/api', opportunitiesRouter(opportunityRepository));
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
  }

  private setupWebSocket(): void {
    this.io.on('connection', (socket) => {
      logger.info('Client connected to dashboard', { socketId: socket.id });

      socket.emit('bot:status', {
        mode: config.exchange.testnet ? 'testnet' : 'live',
        isRunning: true,
        minSpread: config.strategy.minSpreadPercent,
        maxPosition: config.strategy.maxPositionPercent,
        timestamp: new Date().toISOString(),
      });

      socket.on('disconnect', () => {
        logger.info('Client disconnected from dashboard', { socketId: socket.id });
      });
    });
  }

  broadcastTradeNew(trade: object): void {
    this.io.emit('trade:new', trade);
  }

  broadcastTradeUpdate(trade: object): void {
    this.io.emit('trade:update', trade);
  }

  broadcastOpportunity(opportunity: object): void {
    this.io.emit('opportunity:detected', opportunity);
  }

  broadcastStatus(status: object): void {
    this.io.emit('bot:status', status);
  }

  broadcastProfitSummary(summary: object): void {
    this.io.emit('profit:update', summary);
  }

  broadcastTicker(priceData: object): void {
    this.io.emit('ticker:update', priceData);
  }

  public async start(): Promise<void> {
    const realPort = await detectPort(this.port);
    this.port = realPort
    this.server.listen(this.port, () => {
      logger.info('Dashboard server started', {
        port: this.port,
        url: `http://localhost:${this.port}`,
      });
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      this.io.close();
      this.server.close(() => {
        logger.info('Dashboard server stopped');
        resolve();
      });
    });
  }
}

export default DashboardServer;
