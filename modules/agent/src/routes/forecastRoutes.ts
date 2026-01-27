import { Router } from 'express';
import * as forecastController from '../controllers/forecastController.js';

export const forecastRouter = Router();

forecastRouter.get('/forecast/recommendations', forecastController.getStockoutRisks);
forecastRouter.get('/forecast/seasonal/:sku', forecastController.getSeasonalPattern);
forecastRouter.get('/forecast/:sku', forecastController.getForecast);
