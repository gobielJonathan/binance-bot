import { Router, Request, Response } from 'express';
import logger from '../../../utils/logger';
import { OpportunityRepository } from '../../../repositories';

export default function opportunitiesRouter(
  opportunityRepository: OpportunityRepository
): Router {
  const router = Router();

  router.get('/opportunities/recent', async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const opportunities = await opportunityRepository.getRecentOpportunities(limit);
      res.json(opportunities);
    } catch (error) {
      logger.error('Error getting opportunities', { error });
      res.status(500).json({ error: 'Failed to get opportunities' });
    }
  });

  return router;
}
