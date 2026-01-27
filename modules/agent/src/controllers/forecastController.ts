import { Request, Response } from 'express';
import * as forecastService from '../services/forecastService.js';

export const getForecast = (req: Request, res: Response) => {
  const sku = req.params.sku;
  const periodDays = parseInt(req.query.period as string) || 30;
  res.json(forecastService.getForecast(sku, periodDays));
};

export const getAllForecasts = (req: Request, res: Response) => {
  const periodDays = parseInt(req.query.period as string) || 30;
  res.json(forecastService.getAllForecasts(periodDays));
};

export const getSeasonalPattern = (req: Request, res: Response) => {
  res.json(forecastService.getSeasonalPattern(req.params.sku));
};

export const getStockoutRisks = (_req: Request, res: Response) => {
  res.json(forecastService.getStockoutRisks());
};
