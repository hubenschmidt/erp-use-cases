import { Request, Response } from 'express';
import * as inventoryService from '../services/inventoryService.js';

interface TransferRequest {
  sku: string;
  from_location: string;
  to_location: string;
  qty: number;
}

export const getInventory = (req: Request, res: Response) => {
  const location = req.query.location as string | undefined;
  res.json(inventoryService.getStock(location));
};

export const getInventoryBySku = (req: Request, res: Response) => {
  res.json(inventoryService.getStockBySku(req.params.sku));
};

export const transferStock = (req: Request, res: Response) => {
  const body = req.body as TransferRequest;
  res.json(
    inventoryService.transferStock(body.sku, body.from_location, body.to_location, body.qty)
  );
};

export const getLocations = (_req: Request, res: Response) => {
  res.json(inventoryService.getLocations());
};
