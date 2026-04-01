import express, { Request, Response } from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { createServer } from 'http';
import path from 'path';
import config from '../config';
import logger from '../utils/logger';
import Database from '../services/database';

class DashboardServer {
  private app: express.Application;
  private server: ReturnType<typeof createServer>;
  private io: Server;
  private database: Database;
  private port: number;

  constructor(database: Database) {
    this.database = database;
    this.port = config.dashboard.port;
    this.app = express();
    this.server = createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
    
    // Serve static files from ui/dist
    const uiPath = path.join(__dirname, '../../ui/dist');
    this.app.use(express.static(uiPath));
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/api/health', (req: Request, res: Response) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Get bot status
    this.app.get('/api/status', async (req: Request, res: Response) => {
      try {
        res.json({
          mode: config.exchange.testnet ? 'testnet' : 'live',
          isRunning: true,
          minSpread: config.strategy.minSpreadPercent,
          maxPosition: config.strategy.maxPositionPercent,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        logger.error('Error getting status', { error });
        res.status(500).json({ error: 'Failed to get status' });
      }
    });

    // Get recent trades
    this.app.get('/api/trades', async (req: Request, res: Response) => {
      try {
        const limit = parseInt(req.query.limit as string) || 50;
        const trades = await this.database.getRecentTrades(limit);
        res.json(trades);
      } catch (error) {
        logger.error('Error getting trades', { error });
        res.status(500).json({ error: 'Failed to get trades' });
      }
    });

    // Get performance metrics
    this.app.get('/api/metrics', async (req: Request, res: Response) => {
      try {
        const period = (req.query.period as string) || 'daily';
        const metrics = await this.getAggregatedMetrics(period);
        res.json(metrics);
      } catch (error) {
        logger.error('Error getting metrics', { error });
        res.status(500).json({ error: 'Failed to get metrics' });
      }
    });

    // Get profit summary
    this.app.get('/api/profit', async (req: Request, res: Response) => {
      try {
        const summary = await this.getProfitSummary();
        res.json(summary);
      } catch (error) {
        logger.error('Error getting profit summary', { error });
        res.status(500).json({ error: 'Failed to get profit summary' });
      }
    });

    // Catch-all route - serve index.html for client-side routing
    this.app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, '../../ui/dist/index.html'));
    });
  }

  private setupWebSocket(): void {
    this.io.on('connection', (socket) => {
      logger.info('Client connected to dashboard', { socketId: socket.id });

      socket.on('disconnect', () => {
        logger.info('Client disconnected from dashboard', { socketId: socket.id });
      });
    });
  }

  private async getAggregatedMetrics(period: string) {
    const now = new Date();
    let fromDate: Date;

    switch (period) {
      case 'daily':
        fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const trades = await this.database.getRecentTrades(1000);
    const filteredTrades = trades.filter(
      (t) => new Date(t.created_at) >= fromDate && t.status === 'completed'
    );

    const totalProfit = filteredTrades.reduce(
      (sum, t) => sum + (t.actual_profit_usdt || 0),
      0
    );
    const avgProfit =
      filteredTrades.length > 0 ? totalProfit / filteredTrades.length : 0;

    return {
      period,
      totalTrades: filteredTrades.length,
      totalProfit,
      avgProfit,
      winRate:
        filteredTrades.length > 0
          ? (filteredTrades.filter((t) => (t.actual_profit_usdt || 0) > 0).length /
              filteredTrades.length) *
            100
          : 0,
      data: this.groupTradesByDate(filteredTrades, period),
    };
  }

  private groupTradesByDate(trades: any[], period: string) {
    const grouped: { [key: string]: { profit: number; count: number } } = {};

    trades.forEach((trade) => {
      const date = new Date(trade.created_at);
      let key: string;

      switch (period) {
        case 'daily':
          key = date.toISOString().split('T')[0]; // YYYY-MM-DD
          break;
        case 'weekly':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'monthly':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          key = date.toISOString().split('T')[0];
      }

      if (!grouped[key]) {
        grouped[key] = { profit: 0, count: 0 };
      }

      grouped[key].profit += trade.actual_profit_usdt || 0;
      grouped[key].count += 1;
    });

    return Object.entries(grouped)
      .map(([date, data]) => ({
        date,
        profit: data.profit,
        count: data.count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private async getProfitSummary() {
    const trades = await this.database.getRecentTrades(1000);
    const completedTrades = trades.filter((t) => t.status === 'completed');

    const totalProfit = completedTrades.reduce(
      (sum, t) => sum + (t.actual_profit_usdt || 0),
      0
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayTrades = completedTrades.filter(
      (t) => new Date(t.created_at) >= today
    );
    const todayProfit = todayTrades.reduce(
      (sum, t) => sum + (t.actual_profit_usdt || 0),
      0
    );

    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekTrades = completedTrades.filter(
      (t) => new Date(t.created_at) >= weekAgo
    );
    const weekProfit = weekTrades.reduce(
      (sum, t) => sum + (t.actual_profit_usdt || 0),
      0
    );

    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const monthTrades = completedTrades.filter(
      (t) => new Date(t.created_at) >= monthAgo
    );
    const monthProfit = monthTrades.reduce(
      (sum, t) => sum + (t.actual_profit_usdt || 0),
      0
    );

    return {
      total: {
        profit: totalProfit,
        trades: completedTrades.length,
      },
      today: {
        profit: todayProfit,
        trades: todayTrades.length,
      },
      week: {
        profit: weekProfit,
        trades: weekTrades.length,
      },
      month: {
        profit: monthProfit,
        trades: monthTrades.length,
      },
    };
  }

  // Broadcast trade update to all connected clients
  public broadcastTradeUpdate(trade: any): void {
    this.io.emit('trade:update', trade);
  }

  // Broadcast opportunity to all connected clients
  public broadcastOpportunity(opportunity: any): void {
    this.io.emit('opportunity:new', opportunity);
  }

  public start(): void {
    this.server.listen(this.port, () => {
      logger.info(`Dashboard server started`, {
        port: this.port,
        url: `http://localhost:${this.port}`,
      });
      console.log(`\n📊 Dashboard: http://localhost:${this.port}\n`);
    });
  }

  public stop(): void {
    this.io.close();
    this.server.close();
    logger.info('Dashboard server stopped');
  }
}

export default DashboardServer;
