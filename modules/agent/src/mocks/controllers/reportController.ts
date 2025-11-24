import { Router, Request, Response } from 'express';
import * as inventoryService from '../services/inventoryService.js';

export const reportRouter = Router();

reportRouter.get('/reports/low-stock', (_req: Request, res: Response) => {
  res.json(inventoryService.getLowStockAlerts());
});

reportRouter.get('/reports/dead-stock', (req: Request, res: Response) => {
  const days = parseInt(req.query.days as string, 10) || 90;
  res.json(inventoryService.getDeadStock(days));
});
