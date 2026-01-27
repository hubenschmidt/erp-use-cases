import { Router } from 'express';
import * as inventoryController from '../controllers/inventoryController.js';

export const inventoryRouter = Router();

inventoryRouter.get('/inventory', inventoryController.getInventory);
inventoryRouter.get('/inventory/:sku', inventoryController.getInventoryBySku);
inventoryRouter.post('/inventory/transfer', inventoryController.transferStock);
inventoryRouter.get('/locations', inventoryController.getLocations);
