import sqlite3 from 'sqlite3';
import logger from '../utils/logger';

export interface DatabaseConnection {
  run(sql: string, params?: any[]): Promise<sqlite3.RunResult>;
  get(sql: string, params?: any[]): Promise<any>;
  all(sql: string, params?: any[]): Promise<any[]>;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DateRangeFilter {
  startDate?: string;
  endDate?: string;
}

export abstract class BaseRepository {
  protected db: DatabaseConnection;

  constructor(database: sqlite3.Database) {
    this.db = this.createAsyncWrapper(database);
  }

  private createAsyncWrapper(database: sqlite3.Database): DatabaseConnection {
    return {
      async run(sql: string, params: any[] = []): Promise<sqlite3.RunResult> {
        return new Promise((resolve, reject) => {
          database.run(sql, params, function(err: Error | null) {
            if (err) {
              logger.error('SQL run error', { sql, params, error: err });
              reject(err);
            } else {
              resolve(this as sqlite3.RunResult);
            }
          });
        });
      },

      async get(sql: string, params: any[] = []): Promise<any> {
        return new Promise((resolve, reject) => {
          database.get(sql, params, (err: Error | null, row: any) => {
            if (err) {
              logger.error('SQL get error', { sql, params, error: err });
              reject(err);
            } else {
              resolve(row);
            }
          });
        });
      },

      async all(sql: string, params: any[] = []): Promise<any[]> {
        return new Promise((resolve, reject) => {
          database.all(sql, params, (err: Error | null, rows: any[]) => {
            if (err) {
              logger.error('SQL all error', { sql, params, error: err });
              reject(err);
            } else {
              resolve(rows);
            }
          });
        });
      }
    };
  }

  protected async getPaginatedResults<T>(
    baseQuery: string,
    countQuery: string,
    params: any[],
    page: number,
    limit: number
  ): Promise<PaginatedResult<T>> {
    const offset = (page - 1) * limit;
    
    // Get total count
    const countResult = await this.db.get(countQuery, params);
    const total = countResult?.total || 0;
    
    // Get paginated data
    const data = await this.db.all(`${baseQuery} LIMIT ? OFFSET ?`, [...params, limit, offset]);
    
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  protected buildWhereClause(conditions: Array<{ field: string; value: any; operator?: string }>): { where: string; params: any[] } {
    if (conditions.length === 0) {
      return { where: '', params: [] };
    }

    const whereClauses: string[] = [];
    const params: any[] = [];

    conditions.forEach(({ field, value, operator = '=' }) => {
      if (value !== undefined && value !== null) {
        whereClauses.push(`${field} ${operator} ?`);
        params.push(value);
      }
    });

    return {
      where: whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '',
      params
    };
  }
}