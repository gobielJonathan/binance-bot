import sqlite3 from 'sqlite3';
import { BaseRepository, PaginatedResult, DateRangeFilter } from './base-repository';
import { Trade } from '../services/database';

export interface TradeFilter extends DateRangeFilter {
  status?: string;
  triangle?: string;
}

export interface TradeStats {
  totalTrades: number;
  profitableTrades: number;
  losingTrades: number;
  winRate: number;
  totalProfit: number;
  avgProfit: number;
  bestTrade?: {
    id: number;
    triangle: string;
    profit: number;
    date: string;
  };
  worstTrade?: {
    id: number;
    triangle: string;
    profit: number;
    date: string;
  };
}

export class TradeRepository extends BaseRepository {
  constructor(database: sqlite3.Database) {
    super(database);
  }

  /**
   * Get trades with open status (pending, in_progress)
   */
  async getOpenTrades(): Promise<Trade[]> {
    const sql = `
      SELECT * FROM trades 
      WHERE status IN ('pending', 'in_progress') 
      ORDER BY created_at DESC
    `;
    
    return await this.db.all(sql);
  }

  /**
   * Get recent trades with limit
   */
  async getRecentTrades(limit: number = 50): Promise<Trade[]> {
    const sql = `SELECT * FROM trades ORDER BY created_at DESC LIMIT ?`;
    return await this.db.all(sql, [limit]);
  }

  /**
   * Get trade history with filtering and pagination
   */
  async getTradeHistory(filters: TradeFilter & { page: number; limit: number }): Promise<PaginatedResult<Trade>> {
    const conditions = [
      { field: 'status', value: filters.status },
      { field: 'triangle_name', value: filters.triangle },
      { field: 'created_at', value: filters.startDate, operator: '>=' },
      { field: 'created_at', value: filters.endDate, operator: '<=' }
    ];

    const { where, params } = this.buildWhereClause(conditions);
    
    const baseQuery = `SELECT * FROM trades ${where} ORDER BY created_at DESC`;
    const countQuery = `SELECT COUNT(*) as total FROM trades ${where}`;

    return await this.getPaginatedResults<Trade>(
      baseQuery,
      countQuery,
      params,
      filters.page,
      filters.limit
    );
  }

  /**
   * Get completed trades for statistics calculation
   */
  async getCompletedTrades(limit: number = 1000): Promise<Trade[]> {
    const sql = `
      SELECT * FROM trades 
      WHERE status = 'completed' 
      ORDER BY created_at DESC 
      LIMIT ?
    `;
    
    return await this.db.all(sql, [limit]);
  }

  /**
   * Get trade statistics (calculations done in memory for flexibility)
   */
  async getTradeStats(): Promise<TradeStats> {
    const trades = await this.getCompletedTrades(1000);
    
    const totalTrades = trades.length;
    const profitableTrades = trades.filter(t => (t.actual_profit_usdt || 0) > 0);
    const losingTrades = trades.filter(t => (t.actual_profit_usdt || 0) <= 0);

    const totalProfit = trades.reduce((sum, t) => sum + (t.actual_profit_usdt || 0), 0);
    const avgProfit = totalTrades > 0 ? totalProfit / totalTrades : 0;
    const winRate = totalTrades > 0 ? (profitableTrades.length / totalTrades) * 100 : 0;

    // Find best and worst trades
    const bestTrade = trades.reduce(
      (best, t) => (!best || (t.actual_profit_usdt || 0) > (best.actual_profit_usdt || 0) ? t : best),
      null as Trade | null
    );

    const worstTrade = trades.reduce(
      (worst, t) => (!worst || (t.actual_profit_usdt || 0) < (worst.actual_profit_usdt || 0) ? t : worst),
      null as Trade | null
    );

    return {
      totalTrades,
      profitableTrades: profitableTrades.length,
      losingTrades: losingTrades.length,
      winRate,
      totalProfit,
      avgProfit,
      bestTrade: bestTrade ? {
        id: bestTrade.id!,
        triangle: bestTrade.triangle_name,
        profit: bestTrade.actual_profit_usdt!,
        date: bestTrade.created_at
      } : undefined,
      worstTrade: worstTrade ? {
        id: worstTrade.id!,
        triangle: worstTrade.triangle_name,
        profit: worstTrade.actual_profit_usdt!,
        date: worstTrade.created_at
      } : undefined
    };
  }

  /**
   * Insert a new trade
   */
  async insertTrade(trade: Omit<Trade, 'id'>): Promise<number> {
    const sql = `
      INSERT INTO trades (
        triangle_name, leg1_pair, leg1_side, leg1_amount, leg1_price, leg1_filled,
        leg2_pair, leg2_side, leg2_amount, leg2_price, leg2_filled,
        leg3_pair, leg3_side, leg3_amount, leg3_price, leg3_filled,
        expected_profit_percent, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await this.db.run(sql, [
      trade.triangle_name,
      trade.leg1_pair,
      trade.leg1_side,
      trade.leg1_amount,
      trade.leg1_price,
      trade.leg1_filled,
      trade.leg2_pair,
      trade.leg2_side,
      trade.leg2_amount,
      trade.leg2_price,
      trade.leg2_filled,
      trade.leg3_pair,
      trade.leg3_side,
      trade.leg3_amount,
      trade.leg3_price,
      trade.leg3_filled,
      trade.expected_profit_percent,
      trade.status,
      trade.created_at
    ]);

    return result.lastID!;
  }

  /**
   * Update an existing trade
   */
  async updateTrade(id: number, updates: Partial<Trade>): Promise<void> {
    const fields = Object.keys(updates)
      .map(key => `${key} = ?`)
      .join(', ');
    const values = Object.values(updates);

    const sql = `UPDATE trades SET ${fields} WHERE id = ?`;
    await this.db.run(sql, [...values, id]);
  }
}