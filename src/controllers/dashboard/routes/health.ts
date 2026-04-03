import { Router, Request, Response } from 'express';
import config from '../../../config';

const router: Router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.get('/status', (_req: Request, res: Response) => {
  res.json({
    mode: config.exchange.testnet ? 'testnet' : 'live',
    isRunning: true,
    minSpread: config.strategy.minSpreadPercent,
    maxPosition: config.strategy.maxPositionPercent,
    timestamp: new Date().toISOString(),
  });
});

export default router;
