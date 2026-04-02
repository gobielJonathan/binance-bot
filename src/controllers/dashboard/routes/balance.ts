import { Router, Request, Response } from 'express';
import logger from '../../../utils/logger';
import BalanceManager from '../../../services/trading/balance-manager';

export default function balanceRouter(balanceManager: BalanceManager): Router {
  const router = Router();

  router.get('/balance', async (_req: Request, res: Response) => {
    try {
      const allBalances = await balanceManager.getAllBalances();
      const usdtBalance = allBalances.get('USDT');
      res.json({
        totalUSDT: usdtBalance?.total || 0,
        freeUSDT: usdtBalance?.free || 0,
        lastUpdate: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error getting balance', { error });
      res.status(500).json({ error: 'Failed to get balance' });
    }
  });

  return router;
}
