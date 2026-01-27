import { Router } from 'express';
import * as reportController from '../controllers/reportController.js';

export const reportRouter = Router();

reportRouter.get('/reports/low-stock', reportController.getLowStock);
reportRouter.get('/reports/dead-stock', reportController.getDeadStock);
