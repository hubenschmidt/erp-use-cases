import { Router, Request, Response } from 'express';
import * as inventoryService from '../services/inventoryService.js';

export const inventoryRouter = Router();

interface TransferRequest {
  sku: string;
  from_location: string;
  to_location: string;
  qty: number;
}

inventoryRouter.get('/inventory', (req: Request, res: Response) => {
  const location = req.query.location as string | undefined;
  res.json(inventoryService.getStock(location));
});

inventoryRouter.get('/inventory/:sku', (req: Request, res: Response) => {
  res.json(inventoryService.getStockBySku(req.params.sku));
});

inventoryRouter.post('/inventory/transfer', (req: Request, res: Response) => {
  const body = req.body as TransferRequest;
  res.json(
    inventoryService.transferStock(body.sku, body.from_location, body.to_location, body.qty)
  );
});

inventoryRouter.get('/locations', (_req: Request, res: Response) => {
  res.json(inventoryService.getLocations());
});
