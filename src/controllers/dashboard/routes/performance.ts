import { Router, Request, Response } from 'express';
import logger from '../../../utils/logger';
import Database from '../../../services/database';
import { MetricsRepository } from '../../../repositories';

function groupTradesByDate(trades: any[], period: string) {
  const grouped: { [key: string]: { profit: number; count: number } } = {};

  trades.forEach((trade) => {
    const date = new Date(trade.created_at);
    let key: string;

    switch (period) {
      case 'weekly': {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
        break;
      }
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
    .map(([date, data]) => ({ date, profit: data.profit, count: data.count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function getAggregatedMetrics(database: Database, period: string) {
  const now = new Date();
  const msMap: Record<string, number> = {
    daily: 24 * 60 * 60 * 1000,
    weekly: 7 * 24 * 60 * 60 * 1000,
    monthly: 30 * 24 * 60 * 60 * 1000,
  };
  const fromDate = new Date(now.getTime() - (msMap[period] ?? msMap.daily));

  const trades = await database.getRecentTrades(1000);
  const filtered = trades.filter(
    (t) => new Date(t.created_at) >= fromDate && t.status === 'completed'
  );

  const totalProfit = filtered.reduce((sum, t) => sum + (t.actual_profit_usdt || 0), 0);
  const avgProfit = filtered.length > 0 ? totalProfit / filtered.length : 0;

  return {
    period,
    totalTrades: filtered.length,
    totalProfit,
    avgProfit,
    winRate:
      filtered.length > 0
        ? (filtered.filter((t) => (t.actual_profit_usdt || 0) > 0).length / filtered.length) * 100
        : 0,
    data: groupTradesByDate(filtered, period),
  };
}

async function getProfitSummary(database: Database) {
  const trades = await database.getRecentTrades(1000);
  const completed = trades.filter((t) => t.status === 'completed');

  const totalProfit = completed.reduce((sum, t) => sum + (t.actual_profit_usdt || 0), 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const slice = (from: Date) => completed.filter((t) => new Date(t.created_at) >= from);
  const profit = (ts: any[]) => ts.reduce((s, t) => s + (t.actual_profit_usdt || 0), 0);

  const todayTrades = slice(today);
  const weekTrades = slice(weekAgo);
  const monthTrades = slice(monthAgo);

  return {
    total: { profit: totalProfit, trades: completed.length },
    today: { profit: profit(todayTrades), trades: todayTrades.length },
    week: { profit: profit(weekTrades), trades: weekTrades.length },
    month: { profit: profit(monthTrades), trades: monthTrades.length },
  };
}

export default function performanceRouter(
  database: Database,
  metricsRepository: MetricsRepository
): Router {
  const router = Router();

  router.get('/metrics', async (req: Request, res: Response) => {
    try {
      const period = (req.query.period as string) || 'daily';
      const metrics = await getAggregatedMetrics(database, period);
      res.json(metrics);
    } catch (error) {
      logger.error('Error getting metrics', { error });
      res.status(500).json({ error: 'Failed to get metrics' });
    }
  });

  router.get('/profit', async (_req: Request, res: Response) => {
    try {
      const summary = await getProfitSummary(database);
      res.json(summary);
    } catch (error) {
      logger.error('Error getting profit summary', { error });
      res.status(500).json({ error: 'Failed to get profit summary' });
    }
  });

  router.get('/performance/daily', async (req: Request, res: Response) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const performance = await metricsRepository.getPerformanceByPeriod('daily', days);
      res.json(performance);
    } catch (error) {
      logger.error('Error getting daily performance', { error });
      res.status(500).json({ error: 'Failed to get daily performance' });
    }
  });

  router.get('/performance/weekly', async (req: Request, res: Response) => {
    try {
      const weeks = parseInt(req.query.weeks as string) || 12;
      const performance = await metricsRepository.getPerformanceByPeriod('weekly', weeks);
      res.json(performance);
    } catch (error) {
      logger.error('Error getting weekly performance', { error });
      res.status(500).json({ error: 'Failed to get weekly performance' });
    }
  });

  router.get('/performance/monthly', async (req: Request, res: Response) => {
    try {
      const months = parseInt(req.query.months as string) || 12;
      const performance = await metricsRepository.getPerformanceByPeriod('monthly', months);
      res.json(performance);
    } catch (error) {
      logger.error('Error getting monthly performance', { error });
      res.status(500).json({ error: 'Failed to get monthly performance' });
    }
  });

  return router;
}
