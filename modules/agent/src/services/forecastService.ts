/**
 * Forecast Service
 *
 * Business logic for demand forecasting including:
 * - Demand prediction using moving averages
 * - Seasonal pattern detection
 * - Stockout risk identification
 * - Reorder recommendations
 */

import * as salesHistoryRepo from '../repositories/salesHistoryRepo.js';
import * as inventoryRepo from '../repositories/inventoryRepo.js';

interface ForecastResult {
  sku: string;
  forecast_period_days: number;
  predicted_demand: number;
  average_daily_demand: number;
  confidence: string;
  data_points: number;
}

interface SeasonalPattern {
  sku: string;
  monthly_averages: { month: number; avg_qty: number }[];
  peak_month: number;
  low_month: number;
  seasonal_factor: number;
}

interface StockoutRisk {
  sku: string;
  product_name: string;
  current_stock: number;
  predicted_demand_30_days: number;
  days_until_stockout: number;
  risk_level: string;
  recommended_reorder_qty: number;
}

const MIN_DATA_POINTS = 3;

const getConfidenceLevel = (dataPoints: number): string => {
  if (dataPoints >= 6) return 'high';
  if (dataPoints >= 4) return 'medium';
  return 'low';
};

/**
 * Calculate demand forecast for a specific SKU.
 * Uses simple moving average with trend adjustment.
 */
export const getForecast = (sku: string, periodDays: number = 30): ForecastResult | { error: string } => {
  const sales = salesHistoryRepo.findSalesBySku(sku);

  if (sales.length < MIN_DATA_POINTS) {
    return {
      error: `Insufficient sales history for ${sku}. Need at least ${MIN_DATA_POINTS} data points, found ${sales.length}.`,
    };
  }

  const sortedSales = [...sales].sort(
    (a, b) => new Date(a.sale_date).getTime() - new Date(b.sale_date).getTime()
  );

  const totalQty = sortedSales.reduce((sum, s) => sum + s.qty_sold, 0);
  const firstDate = new Date(sortedSales[0].sale_date);
  const lastDate = new Date(sortedSales[sortedSales.length - 1].sale_date);
  const daySpan = Math.max(1, (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));

  const avgDailyDemand = totalQty / daySpan;
  const predictedDemand = Math.round(avgDailyDemand * periodDays);

  const confidence = getConfidenceLevel(sales.length);

  return {
    sku,
    forecast_period_days: periodDays,
    predicted_demand: predictedDemand,
    average_daily_demand: Math.round(avgDailyDemand * 100) / 100,
    confidence,
    data_points: sales.length,
  };
};

/**
 * Analyze seasonal patterns for a SKU.
 * Groups sales by month and identifies peak/low periods.
 */
export const getSeasonalPattern = (sku: string): SeasonalPattern | { error: string } => {
  const sales = salesHistoryRepo.findSalesBySku(sku);

  if (sales.length < MIN_DATA_POINTS) {
    return {
      error: `Insufficient sales history for seasonal analysis. Need at least ${MIN_DATA_POINTS} data points.`,
    };
  }

  const monthlyTotals = sales.reduce((acc, sale) => {
    const month = new Date(sale.sale_date).getMonth() + 1;
    const existing = acc.get(month) || { total: 0, count: 0 };
    acc.set(month, {
      total: existing.total + sale.qty_sold,
      count: existing.count + 1,
    });
    return acc;
  }, new Map<number, { total: number; count: number }>());

  const monthlyAverages = Array.from(monthlyTotals.entries())
    .map(([month, data]) => ({
      month,
      avg_qty: Math.round(data.total / data.count),
    }))
    .sort((a, b) => a.month - b.month);

  const peakMonth = monthlyAverages.reduce((max, curr) =>
    curr.avg_qty > max.avg_qty ? curr : max
  );
  const lowMonth = monthlyAverages.reduce((min, curr) =>
    curr.avg_qty < min.avg_qty ? curr : min
  );

  const seasonalFactor = lowMonth.avg_qty > 0
    ? Math.round((peakMonth.avg_qty / lowMonth.avg_qty) * 100) / 100
    : 0;

  return {
    sku,
    monthly_averages: monthlyAverages,
    peak_month: peakMonth.month,
    low_month: lowMonth.month,
    seasonal_factor: seasonalFactor,
  };
};

const getRiskLevel = (daysUntilStockout: number): string => {
  if (daysUntilStockout <= 7) return 'critical';
  if (daysUntilStockout <= 14) return 'high';
  if (daysUntilStockout <= 30) return 'medium';
  return 'low';
};

const calculateStockoutRisk = (sku: string): StockoutRisk | null => {
  const forecast = getForecast(sku, 30);
  if ('error' in forecast) return null;

  const stockItems = inventoryRepo.findStockBySku(sku);
  if (stockItems.length === 0) return null;

  const totalStock = stockItems.reduce(
    (sum, s) => sum + (s.qty_on_hand - s.qty_reserved),
    0
  );
  const productName = stockItems[0].product_name;

  const daysUntilStockout = forecast.average_daily_demand > 0
    ? Math.floor(totalStock / forecast.average_daily_demand)
    : 999;

  const riskLevel = getRiskLevel(daysUntilStockout);
  const recommendedQty = Math.max(0, forecast.predicted_demand - totalStock +
    Math.round(forecast.average_daily_demand * 14)); // 14-day safety stock

  return {
    sku,
    product_name: productName,
    current_stock: totalStock,
    predicted_demand_30_days: forecast.predicted_demand,
    days_until_stockout: daysUntilStockout,
    risk_level: riskLevel,
    recommended_reorder_qty: recommendedQty,
  };
};

/**
 * Identify products at risk of stockout.
 * Compares current inventory against 30-day demand forecast.
 */
export const getStockoutRisks = (): StockoutRisk[] => {
  const skus = salesHistoryRepo.getUniqueSKUs();
  
  return skus
    .map(calculateStockoutRisk)
    .filter((risk): risk is StockoutRisk => risk !== null && risk.risk_level !== 'low')
    .sort((a, b) => a.days_until_stockout - b.days_until_stockout);
};

/**
 * Get all forecasts for products with sufficient history.
 */
export const getAllForecasts = (periodDays: number = 30) => {
  const skus = salesHistoryRepo.getUniqueSKUs();
  
  return skus
    .map((sku) => getForecast(sku, periodDays))
    .filter((forecast): forecast is ForecastResult => !('error' in forecast))
    .sort((a, b) => b.predicted_demand - a.predicted_demand);
};
