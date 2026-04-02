import { Router, Request, Response } from 'express';
import logger from '../../../utils/logger';
import Database from '../../../services/database';
import { TradeRepository } from '../../../repositories';

export default function tradesRouter(
  database: Database,
  tradeRepository: TradeRepository
): Router {
  const router = Router();

  router.get('/', async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const trades = await database.getRecentTrades(limit);
      res.json(trades);
    } catch (error) {
      logger.error('Error getting trades', { error });
      res.status(500).json({ error: 'Failed to get trades' });
    }
  });

  router.get('/open', async (_req: Request, res: Response) => {
    try {
      const openTrades = await tradeRepository.getOpenTrades();
      res.json(openTrades);
    } catch (error) {
      logger.error('Error getting open trades', { error });
      res.status(500).json({ error: 'Failed to get open trades' });
    }
  });

  router.get('/history', async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const status = req.query.status as string;
      const triangle = req.query.triangle as string;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;

      const result = await tradeRepository.getTradeHistory({
        page,
        limit,
        status,
        triangle,
        startDate,
        endDate,
      });

      res.json({
        trades: result.data,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      });
    } catch (error) {
      logger.error('Error getting trade history', { error });
      res.status(500).json({ error: 'Failed to get trade history' });
    }
  });

  router.get('/stats', async (_req: Request, res: Response) => {
    try {
      const stats = await tradeRepository.getTradeStats();
      res.json(stats);
    } catch (error) {
      logger.error('Error getting trade stats', { error });
      res.status(500).json({ error: 'Failed to get trade stats' });
    }
  });

  return router;
}
