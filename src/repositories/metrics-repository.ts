import sqlite3 from 'sqlite3';
import { BaseRepository } from './base-repository';
import { PerformanceMetric } from '../services/database';
import { Trade } from '../services/database';

export interface PerformanceData {
  date: string;
  profit: number;
  count: number;
  avgProfit: number;
  cumulativeProfit: number;
}

export interface PerformanceResult {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    type: string;
  }>;
  stats: {
    totalProfit: number;
    totalTrades: number;
    avgProfitPerPeriod: number;
  };
}

export class MetricsRepository extends BaseRepository {
  constructor(database: sqlite3.Database) {
    super(database);
  }

  /**
   * Insert a performance metric
   */
  async insertMetric(metric: Omit<PerformanceMetric, 'id'>): Promise<number> {
    const sql = `
      INSERT INTO performance_metrics (metric_type, value, timestamp) 
      VALUES (?, ?, ?)
    `;

    const result = await this.db.run(sql, [
      metric.metric_type,
      metric.value,
      metric.timestamp
    ]);

    return result.lastID!;
  }

  /**
   * Get metrics within a date range for a specific type
   */
  async getMetrics(
    metricType: string,
    fromDate: string,
    toDate: string
  ): Promise<PerformanceMetric[]> {
    const sql = `
      SELECT * FROM performance_metrics 
      WHERE metric_type = ? AND timestamp BETWEEN ? AND ?
      ORDER BY timestamp ASC
    `;

    return await this.db.all(sql, [metricType, fromDate, toDate]);
  }

  /**
   * Get performance data by period using completed trades
   */
  async getPerformanceByPeriod(
    period: 'daily' | 'weekly' | 'monthly', 
    count: number
  ): Promise<PerformanceResult> {
    // Get completed trades
    const sql = `
      SELECT * FROM trades 
      WHERE status = 'completed' 
      ORDER BY created_at ASC
    `;

    const trades: Trade[] = await this.db.all(sql);
    
    // Group trades by period
    const grouped: { [key: string]: { profit: number; count: number; trades: Trade[] } } = {};

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
        grouped[key] = { profit: 0, count: 0, trades: [] };
      }

      grouped[key].profit += trade.actual_profit_usdt || 0;
      grouped[key].count += 1;
      grouped[key].trades.push(trade);
    });

    // Convert to sorted array and calculate cumulative profit
    const data = Object.entries(grouped)
      .map(([date, stats]) => ({
        date,
        profit: stats.profit,
        count: stats.count,
        avgProfit: stats.count > 0 ? stats.profit / stats.count : 0,
        cumulativeProfit: 0, // Will be calculated below
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate cumulative profit
    let cumulative = 0;
    data.forEach((item) => {
      cumulative += item.profit;
      item.cumulativeProfit = cumulative;
    });

    // Limit to requested count
    const limitedData = data.slice(-count);

    // Format for Chart.js
    return {
      labels: limitedData.map((d) => d.date),
      datasets: [
        {
          label: 'Cumulative Profit (USDT)',
          data: limitedData.map((d) => d.cumulativeProfit),
          type: 'line',
        },
        {
          label: 'Profit (USDT)',
          data: limitedData.map((d) => d.profit),
          type: 'bar',
        },
      ],
      stats: {
        totalProfit: cumulative,
        totalTrades: trades.length,
        avgProfitPerPeriod:
          limitedData.length > 0 
            ? limitedData.reduce((sum, d) => sum + d.profit, 0) / limitedData.length 
            : 0,
      },
    };
  }

  /**
   * Get aggregated metrics for a specific period
   */
  async getAggregatedMetrics(period: string, fromDate: Date): Promise<{
    period: string;
    totalTrades: number;
    totalProfit: number;
    avgProfit: number;
    winRate: number;
    data: PerformanceData[];
  }> {
    // Get all completed trades
    const sql = `
      SELECT * FROM trades 
      WHERE status = 'completed' AND created_at >= ?
      ORDER BY created_at ASC
    `;

    const trades: Trade[] = await this.db.all(sql, [fromDate.toISOString()]);
    
    const totalProfit = trades.reduce((sum, t) => sum + (t.actual_profit_usdt || 0), 0);
    const avgProfit = trades.length > 0 ? totalProfit / trades.length : 0;
    const winRate = trades.length > 0 
      ? (trades.filter(t => (t.actual_profit_usdt || 0) > 0).length / trades.length) * 100 
      : 0;

    // Group by date for chart data
    const data = this.groupTradesByDate(trades, period);

    return {
      period,
      totalTrades: trades.length,
      totalProfit,
      avgProfit,
      winRate,
      data
    };
  }

  /**
   * Helper method to group trades by date period
   */
  private groupTradesByDate(trades: Trade[], period: string): PerformanceData[] {
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

    // Convert to array and calculate cumulative profit
    const data = Object.entries(grouped)
      .map(([date, stats]) => ({
        date,
        profit: stats.profit,
        count: stats.count,
        avgProfit: stats.count > 0 ? stats.profit / stats.count : 0,
        cumulativeProfit: 0
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate cumulative profit
    let cumulative = 0;
    data.forEach((item) => {
      cumulative += item.profit;
      item.cumulativeProfit = cumulative;
    });

    return data;
  }
}