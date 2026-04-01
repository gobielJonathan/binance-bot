import sqlite3 from 'sqlite3';
import { BaseRepository } from './base-repository';
import { Opportunity } from '../services/database';

export interface OpportunityFilter {
  executed?: boolean;
  triangleName?: string;
  minSpread?: number;
  maxSpread?: number;
  startDate?: string;
  endDate?: string;
}

export class OpportunityRepository extends BaseRepository {
  constructor(database: sqlite3.Database) {
    super(database);
  }

  /**
   * Get recent opportunities with optional limit
   */
  async getRecentOpportunities(limit: number = 100): Promise<Opportunity[]> {
    const sql = `
      SELECT * FROM opportunities 
      ORDER BY created_at DESC 
      LIMIT ?
    `;
    
    return await this.db.all(sql, [limit]);
  }

  /**
   * Get opportunities with filtering
   */
  async getOpportunities(filter: OpportunityFilter = {}): Promise<Opportunity[]> {
    const conditions = [
      { field: 'executed', value: filter.executed ? 1 : 0 },
      { field: 'triangle_name', value: filter.triangleName },
      { field: 'spread_percent', value: filter.minSpread, operator: '>=' },
      { field: 'spread_percent', value: filter.maxSpread, operator: '<=' },
      { field: 'created_at', value: filter.startDate, operator: '>=' },
      { field: 'created_at', value: filter.endDate, operator: '<=' }
    ];

    // Only include non-null conditions
    const activeConditions = conditions.filter(c => c.value !== undefined);
    const { where, params } = this.buildWhereClause(activeConditions);

    const sql = `
      SELECT * FROM opportunities 
      ${where} 
      ORDER BY created_at DESC
    `;

    return await this.db.all(sql, params);
  }

  /**
   * Get executed opportunities only
   */
  async getExecutedOpportunities(): Promise<Opportunity[]> {
    const sql = `
      SELECT * FROM opportunities 
      WHERE executed = 1 
      ORDER BY created_at DESC
    `;
    
    return await this.db.all(sql);
  }

  /**
   * Get missed (non-executed) opportunities
   */
  async getMissedOpportunities(): Promise<Opportunity[]> {
    const sql = `
      SELECT * FROM opportunities 
      WHERE executed = 0 
      ORDER BY created_at DESC
    `;
    
    return await this.db.all(sql);
  }

  /**
   * Insert a new opportunity
   */
  async insertOpportunity(opportunity: Omit<Opportunity, 'id'>): Promise<number> {
    const sql = `
      INSERT INTO opportunities (
        triangle_name, spread_percent, leg1_pair, leg1_price,
        leg2_pair, leg2_price, leg3_pair, leg3_price, executed, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await this.db.run(sql, [
      opportunity.triangle_name,
      opportunity.spread_percent,
      opportunity.leg1_pair,
      opportunity.leg1_price,
      opportunity.leg2_pair,
      opportunity.leg2_price,
      opportunity.leg3_pair,
      opportunity.leg3_price,
      opportunity.executed ? 1 : 0,
      opportunity.created_at
    ]);

    return result.lastID!;
  }

  /**
   * Mark an opportunity as executed
   */
  async markAsExecuted(id: number): Promise<void> {
    const sql = `UPDATE opportunities SET executed = 1 WHERE id = ?`;
    await this.db.run(sql, [id]);
  }

  /**
   * Get opportunity statistics
   */
  async getOpportunityStats(days: number = 30): Promise<{
    total: number;
    executed: number;
    missed: number;
    executionRate: number;
    avgSpread: number;
    maxSpread: number;
  }> {
    const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    
    const sql = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN executed = 1 THEN 1 ELSE 0 END) as executed,
        SUM(CASE WHEN executed = 0 THEN 1 ELSE 0 END) as missed,
        AVG(spread_percent) as avgSpread,
        MAX(spread_percent) as maxSpread
      FROM opportunities 
      WHERE created_at >= ?
    `;

    const stats = await this.db.get(sql, [fromDate]);
    
    return {
      total: stats.total || 0,
      executed: stats.executed || 0,
      missed: stats.missed || 0,
      executionRate: stats.total > 0 ? (stats.executed / stats.total) * 100 : 0,
      avgSpread: stats.avgSpread || 0,
      maxSpread: stats.maxSpread || 0
    };
  }
}