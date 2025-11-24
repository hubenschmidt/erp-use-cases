import { Request, Response } from 'express';
import * as inventoryService from '../services/inventoryService.js';

export const getLowStock = (_req: Request, res: Response) => {
  res.json(inventoryService.getLowStockAlerts());
};

export const getDeadStock = (req: Request, res: Response) => {
  const days = parseInt(req.query.days as string, 10) || 90;
  res.json(inventoryService.getDeadStock(days));
};
