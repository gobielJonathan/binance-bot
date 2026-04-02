import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import logger from '../utils/logger';

export interface Trade {
  id?: number;
  triangle_name: string;
  leg1_pair: string;
  leg1_side: string;
  leg1_amount: number;
  leg1_price: number;
  leg1_filled: number;
  leg2_pair: string;
  leg2_side: string;
  leg2_amount: number;
  leg2_price: number;
  leg2_filled: number;
  leg3_pair: string;
  leg3_side: string;
  leg3_amount: number;
  leg3_price: number;
  leg3_filled: number;
  expected_profit_percent: number;
  actual_profit_percent?: number;
  actual_profit_usdt?: number;
  status:
    | 'pending'
    | 'in_progress'
    | 'completed'
    | 'failed'
    | 'partial'
    | 'recovering'
    | 'recovered'
    | 'stranded';
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

export interface Opportunity {
  id?: number;
  triangle_name: string;
  spread_percent: number;
  leg1_pair: string;
  leg1_price: number;
  leg2_pair: string;
  leg2_price: number;
  leg3_pair: string;
  leg3_price: number;
  executed: boolean;
  created_at: string;
}

export interface PerformanceMetric {
  id?: number;
  metric_type: string;
  value: number;
  timestamp: string;
}

class Database {
  private db: sqlite3.Database;

  constructor(dbPath: string = 'data/trading.db') {
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        logger.error('Failed to connect to database', { error: err.message });
        throw err;
      }
      logger.info('Connected to SQLite database', { path: dbPath });
    });

    this.initialize();
  }

  private async initialize() {
    const run = promisify(this.db.run.bind(this.db));

    try {
      await run(`
        CREATE TABLE IF NOT EXISTS trades (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          triangle_name TEXT NOT NULL,
          leg1_pair TEXT NOT NULL,
          leg1_side TEXT NOT NULL,
          leg1_amount REAL NOT NULL,
          leg1_price REAL NOT NULL,
          leg1_filled REAL DEFAULT 0,
          leg2_pair TEXT NOT NULL,
          leg2_side TEXT NOT NULL,
          leg2_amount REAL NOT NULL,
          leg2_price REAL NOT NULL,
          leg2_filled REAL DEFAULT 0,
          leg3_pair TEXT NOT NULL,
          leg3_side TEXT NOT NULL,
          leg3_amount REAL NOT NULL,
          leg3_price REAL NOT NULL,
          leg3_filled REAL DEFAULT 0,
          expected_profit_percent REAL NOT NULL,
          actual_profit_percent REAL,
          actual_profit_usdt REAL,
          status TEXT NOT NULL,
          error_message TEXT,
          created_at TEXT NOT NULL,
          completed_at TEXT
        )
      `);

      await run(`
        CREATE TABLE IF NOT EXISTS opportunities (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          triangle_name TEXT NOT NULL,
          spread_percent REAL NOT NULL,
          leg1_pair TEXT NOT NULL,
          leg1_price REAL NOT NULL,
          leg2_pair TEXT NOT NULL,
          leg2_price REAL NOT NULL,
          leg3_pair TEXT NOT NULL,
          leg3_price REAL NOT NULL,
          executed BOOLEAN DEFAULT 0,
          created_at TEXT NOT NULL
        )
      `);

      await run(`
        CREATE TABLE IF NOT EXISTS performance_metrics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          metric_type TEXT NOT NULL,
          value REAL NOT NULL,
          timestamp TEXT NOT NULL
        )
      `);

      await run(`
        CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status)
      `);

      await run(`
        CREATE INDEX IF NOT EXISTS idx_trades_created ON trades(created_at)
      `);

      await run(`
        CREATE INDEX IF NOT EXISTS idx_opportunities_created ON opportunities(created_at)
      `);

      logger.info('Database schema initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database schema', { error });
      throw error;
    }
  }

  async insertTrade(trade: Trade): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO trades (
          triangle_name, leg1_pair, leg1_side, leg1_amount, leg1_price, leg1_filled,
          leg2_pair, leg2_side, leg2_amount, leg2_price, leg2_filled,
          leg3_pair, leg3_side, leg3_amount, leg3_price, leg3_filled,
          expected_profit_percent, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
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
          trade.created_at,
        ],
        function (this: sqlite3.RunResult, err: Error | null) {
          if (err) {
            reject(err);
          } else {
            resolve(this.lastID);
          }
        }
      );
    });
  }

  async updateTrade(id: number, updates: Partial<Trade>): Promise<void> {
    return new Promise((resolve, reject) => {
      const fields = Object.keys(updates)
        .map((key) => `${key} = ?`)
        .join(', ');
      const values = Object.values(updates);

      this.db.run(`UPDATE trades SET ${fields} WHERE id = ?`, [...values, id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async getRecentTrades(limit: number = 50): Promise<Trade[]> {
    return new Promise((resolve, reject) => {
      this.db.all(`SELECT * FROM trades ORDER BY created_at DESC LIMIT ?`, [limit], (err, rows) => {
        if (err) reject(err);
        else resolve(rows as Trade[]);
      });
    });
  }

  async insertOpportunity(opportunity: Opportunity): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO opportunities (
          triangle_name, spread_percent, leg1_pair, leg1_price,
          leg2_pair, leg2_price, leg3_pair, leg3_price, executed, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          opportunity.triangle_name,
          opportunity.spread_percent,
          opportunity.leg1_pair,
          opportunity.leg1_price,
          opportunity.leg2_pair,
          opportunity.leg2_price,
          opportunity.leg3_pair,
          opportunity.leg3_price,
          opportunity.executed ? 1 : 0,
          opportunity.created_at,
        ],
        function (this: sqlite3.RunResult, err: Error | null) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  async insertMetric(metric: PerformanceMetric): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO performance_metrics (metric_type, value, timestamp) VALUES (?, ?, ?)`,
        [metric.metric_type, metric.value, metric.timestamp],
        function (this: sqlite3.RunResult, err: Error | null) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  async getMetrics(
    metricType: string,
    fromDate: string,
    toDate: string
  ): Promise<PerformanceMetric[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM performance_metrics 
         WHERE metric_type = ? AND timestamp BETWEEN ? AND ?
         ORDER BY timestamp ASC`,
        [metricType, fromDate, toDate],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows as PerformanceMetric[]);
        }
      );
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else {
          logger.info('Database connection closed');
          resolve();
        }
      });
    });
  }

  /**
   * Get the underlying SQLite database instance for repository usage
   */
  getDatabase(): sqlite3.Database {
    return this.db;
  }
}

export default Database;
